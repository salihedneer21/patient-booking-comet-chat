import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Clock, User, CalendarDays } from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import toast from "react-hot-toast";

type BookingStep = "provider" | "datetime" | "details" | "confirm";

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

type ActiveProvider = {
  _id: Id<"providerProfiles">;
  userId: Id<"users">;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  specialty?: string;
  bio?: string;
};

export default function ScheduleAppointmentPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();

  const [step, setStep] = useState<BookingStep>("provider");
  const [selectedProviderId, setSelectedProviderId] = useState<Id<"providerProfiles"> | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [duration, setDuration] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const providers = useQuery(
    api.modules.telehealth.providers.listActive,
    user?._id ? {} : "skip"
  ) as ActiveProvider[] | undefined;
  const selectedProvider = providers?.find((p) => p._id === selectedProviderId);
  const availability = useQuery(
    api.modules.telehealth.availability.getProviderAvailability,
    selectedProvider?.userId ? { providerId: selectedProvider.userId } : "skip"
  ) as Doc<"providerAvailability">[] | undefined;
  const bookedSlots = useQuery(
    api.modules.telehealth.appointments.getBookedSlotsForProvider,
    selectedProvider?.userId && selectedDate
      ? {
          providerId: selectedProvider.userId,
          startTs: startOfDay(selectedDate).getTime(),
          endTs: addDays(startOfDay(selectedDate), 1).getTime(),
        }
      : "skip"
  ) as number[] | undefined;

  const createAppointment = useMutation(api.modules.telehealth.appointments.create);

  if (userLoading) {
    return <FullPageSpinner />;
  }

  // Generate time slots based on provider availability
  const getAvailableTimeSlots = (date: Date): TimeSlot[] => {
    if (!availability || !date) return [];
    if (bookedSlots === undefined) return [];

    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find((a) => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability) return [];

    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = dayAvailability.startTime.split(":").map(Number);
    const [endHour, endMinute] = dayAvailability.endTime.split(":").map(Number);

    // Generate 30-minute slots
    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

      // Check if slot is already booked
      const slotStart = new Date(date);
      slotStart.setHours(currentHour, currentMinute, 0, 0);

      const isBooked = bookedSlots?.some((scheduledAt) => {
        const aptDate = new Date(scheduledAt);
        return (
          isSameDay(aptDate, date) &&
          aptDate.getHours() === currentHour &&
          aptDate.getMinutes() === currentMinute
        );
      });

      // Only show future slots
      const now = new Date();
      const isFuture = slotStart > now;

      if (!isBooked && isFuture) {
        slots.push({
          time: timeString,
          hour: currentHour,
          minute: currentMinute,
        });
      }

      // Advance by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }
    }

    return slots;
  };

  // Get available days (next 30 days with availability)
  const getAvailableDays = (): number[] => {
    if (!availability) return [];
    return availability.map((a) => a.dayOfWeek);
  };

  const availableDays = getAvailableDays();
  const timeSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : [];

  const handleSubmit = async () => {
    if (!user || !selectedProvider || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(selectedTime.hour, selectedTime.minute, 0, 0);

      await createAppointment({
        patientId: user._id,
        providerId: selectedProvider.userId,
        scheduledAt: scheduledAt.getTime(),
        durationMinutes: parseInt(duration),
        reasonForVisit,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      toast.success("Appointment booked successfully!");
      navigate("/patient/bookings");
    } catch {
      toast.error("Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case "provider":
        return !!selectedProviderId;
      case "datetime":
        return !!selectedDate && !!selectedTime;
      case "details":
        return !!reasonForVisit.trim();
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const steps: BookingStep[] = ["provider", "datetime", "details", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const steps: BookingStep[] = ["provider", "datetime", "details", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return format(date, "h:mm a");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Book Appointment</h1>
          <p className="text-muted-foreground">Schedule a visit with a provider</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { key: "provider", label: "Provider" },
          { key: "datetime", label: "Date & Time" },
          { key: "details", label: "Details" },
          { key: "confirm", label: "Confirm" },
        ].map((s, index) => {
          const steps: BookingStep[] = ["provider", "datetime", "details", "confirm"];
          const currentIndex = steps.indexOf(step);
          const stepIndex = steps.indexOf(s.key as BookingStep);
          const isActive = step === s.key;
          const isCompleted = stepIndex < currentIndex;

          return (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  isActive ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {index < 3 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    isCompleted ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === "provider" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Select a Provider</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the healthcare provider you'd like to see
                </p>
              </div>

              {providers === undefined ? (
                <div className="text-center py-8">Loading providers...</div>
              ) : providers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No providers available at this time
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {providers.map((provider) => (
                    <Card
                      key={provider._id}
                      className={`cursor-pointer transition-all ${
                        selectedProviderId === provider._id
                          ? "ring-2 ring-primary"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => setSelectedProviderId(provider._id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={provider.profileImageUrl} />
                            <AvatarFallback>
                              <User className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              {provider.firstName} {provider.lastName}
                            </p>
                            {provider.specialty && (
                              <p className="text-sm text-muted-foreground">
                                {provider.specialty}
                              </p>
                            )}
                          </div>
                          {selectedProviderId === provider._id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "datetime" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Select Date & Time</h2>
                <p className="text-sm text-muted-foreground">
                  Choose an available appointment slot
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    disabled={(date) => {
                      const today = startOfDay(new Date());
                      const maxDate = addDays(today, 30);
                      if (date < today || date > maxDate) return true;
                      return !availableDays.includes(date.getDay());
                    }}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Select Time</Label>
                  {!selectedDate ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      Select a date first
                    </div>
                  ) : bookedSlots === undefined ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      Loading available times...
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      No available slots for this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime?.time === slot.time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(slot)}
                          className="text-sm"
                        >
                          {formatTime(slot.time)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Appointment Details</h2>
                <p className="text-sm text-muted-foreground">
                  Tell us about your visit
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Reason for Visit *</Label>
                  <Textarea
                    id="reason"
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    placeholder="Describe the reason for your appointment..."
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Appointment Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Confirm Appointment</h2>
                <p className="text-sm text-muted-foreground">
                  Review your appointment details
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">
                      {selectedProvider?.firstName} {selectedProvider?.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <CalendarDays className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm">
                      {selectedTime && formatTime(selectedTime.time)} ({duration} minutes)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reason for Visit</p>
                    <p className="font-medium">{reasonForVisit}</p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your appointment will be confirmed by the provider.
                    You'll receive a notification once confirmed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={goToPrevStep}
          disabled={step === "provider"}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {step === "confirm" ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Booking..." : "Confirm Booking"}
          </Button>
        ) : (
          <Button onClick={goToNextStep} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
