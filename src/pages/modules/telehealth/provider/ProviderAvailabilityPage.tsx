import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

const formatTime = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export default function ProviderAvailabilityPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availability = useQuery(
    api.modules.telehealth.availability.getMyAvailability,
    user?._id ? { providerId: user._id as Id<"users"> } : "skip"
  ) as Doc<"providerAvailability">[] | undefined;

  const addSlot = useMutation(api.modules.telehealth.availability.addSlot);
  const deleteSlot = useMutation(api.modules.telehealth.availability.deleteSlot);

  if (userLoading || availability === undefined) {
    return <FullPageSpinner />;
  }

  const handleAddAvailability = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      await addSlot({
        providerId: user._id as Id<"users">,
        dayOfWeek: selectedDay,
        startTime,
        endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      toast.success("Availability added");
      setAddDialogOpen(false);
    } catch {
      toast.error("Failed to add availability");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAvailability = async (
    availabilityId: Id<"providerAvailability">,
  ) => {
    try {
      await deleteSlot({ slotId: availabilityId });
      toast.success("Availability removed");
    } catch {
      toast.error("Failed to remove availability");
    }
  };

  // Get available days that don't have availability set
  const unavailableDays = availability?.map((a) => a.dayOfWeek) || [];
  const availableDaysToAdd = DAYS_OF_WEEK.filter(
    (d) => !unavailableDays.includes(d.value)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Availability</h1>
          <p className="text-muted-foreground">Manage your weekly schedule</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                Set the hours you're available for appointments each day
              </CardDescription>
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              disabled={availableDaysToAdd.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Day
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!availability || availability.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No availability set
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your available hours so patients can book appointments
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayAvailability = availability.find(
                  (a) => a.dayOfWeek === day.value
                );

                return (
                  <div
                    key={day.value}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      dayAvailability ? "" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <p className="font-medium">{day.label}</p>
                      </div>
                      {dayAvailability ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatTime(dayAvailability.startTime)} -{" "}
                            {formatTime(dayAvailability.endTime)}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Available</Badge>
                      )}
                    </div>
                    {dayAvailability && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAvailability(dayAvailability._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Quickly set standard hours for multiple days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={async () => {
                // Set weekday availability
                if (!user) return;
                const weekdays = [1, 2, 3, 4, 5];
                for (const day of weekdays) {
                  if (!availability?.some((a) => a.dayOfWeek === day)) {
                    await addSlot({
                      providerId: user._id as Id<"users">,
                      dayOfWeek: day,
                      startTime: "09:00",
                      endTime: "17:00",
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    });
                  }
                }
                toast.success("Weekday availability set (9 AM - 5 PM)");
              }}
            >
              Set Weekdays (9 AM - 5 PM)
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                // Clear all availability
                if (availability) {
                  for (const a of availability) {
                    await deleteSlot({ slotId: a._id });
                  }
                }
                toast.success("All availability cleared");
              }}
            >
              Clear All Availability
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Notice */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Timezone</p>
              <p className="text-sm text-muted-foreground">
                Your availability is set in your local timezone:{" "}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Availability Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability</DialogTitle>
            <DialogDescription>
              Set your available hours for a specific day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Day of Week</Label>
              <Select
                value={selectedDay.toString()}
                onValueChange={(v) => setSelectedDay(parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableDaysToAdd.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div>
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.filter((t) => t > startTime).map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAvailability} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Availability"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
