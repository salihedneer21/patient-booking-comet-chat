import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, User, MapPin, Phone, Shield } from "lucide-react";
import toast from "react-hot-toast";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export default function PatientProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [isSaving, setIsSaving] = useState(false);

  const intake = useQuery(
    api.modules.telehealth.patientIntake.getMyIntake,
    user?._id ? { userId: user._id } : "skip"
  );

  const updatePersonal = useMutation(api.modules.telehealth.patientIntake.updatePersonalInfo);
  const updateAddress = useMutation(api.modules.telehealth.patientIntake.updateAddress);
  const updateInsurance = useMutation(api.modules.telehealth.patientIntake.updateInsurance);

  // Personal Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");

  // Address
  const [street, setStreet] = useState("");
  const [aptSuiteUnit, setAptSuiteUnit] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [groupNumber, setGroupNumber] = useState("");

  useEffect(() => {
    if (intake) {
      setFirstName(intake.firstName || "");
      setLastName(intake.lastName || "");
      setPhone(intake.phone || "");
      setPreferredLanguage(intake.preferredLanguage || "");
      setStreet(intake.street || "");
      setAptSuiteUnit(intake.aptSuiteUnit || "");
      setCity(intake.city || "");
      setState(intake.state || "");
      setZipCode(intake.zipCode || "");
      setInsuranceProvider(intake.insuranceProvider || "");
      setPolicyNumber(intake.policyNumber || "");
      setGroupNumber(intake.groupNumber || "");
    }
  }, [intake]);

  if (userLoading || intake === undefined) {
    return <FullPageSpinner />;
  }

  if (!intake) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Please complete your intake form first
            </p>
            <Button onClick={() => navigate("/intake")}>
              Complete Intake
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSavePersonal = async () => {
    setIsSaving(true);
    try {
      await updatePersonal({
        intakeId: intake._id,
        firstName,
        lastName,
        dateOfBirth: intake.dateOfBirth,
        sexAtBirth: intake.sexAtBirth,
        phone,
        preferredLanguage: (preferredLanguage as "english" | "spanish") || "english",
      });
      toast.success("Personal information updated");
    } catch {
      toast.error("Failed to update personal information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    setIsSaving(true);
    try {
      await updateAddress({
        intakeId: intake._id,
        street,
        aptSuiteUnit: aptSuiteUnit || undefined,
        city,
        state,
        zipCode,
      });
      toast.success("Address updated");
    } catch {
      toast.error("Failed to update address");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInsurance = async () => {
    setIsSaving(true);
    try {
      await updateInsurance({
        intakeId: intake._id,
        insuranceProvider: insuranceProvider || undefined,
        policyNumber: policyNumber || undefined,
        groupNumber: groupNumber || undefined,
      });
      toast.success("Insurance information updated");
    } catch {
      toast.error("Failed to update insurance");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Update your information</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="language">Preferred Language</Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="Mandarin">Mandarin</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePersonal} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>
              Your home address for records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="apt">Apt/Suite/Unit (Optional)</Label>
              <Input
                id="apt"
                value={aptSuiteUnit}
                onChange={(e) => setAptSuiteUnit(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveAddress} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Insurance Information
            </CardTitle>
            <CardDescription>
              Your health insurance details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="provider">Insurance Provider</Label>
              <Input
                id="provider"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                placeholder="e.g., Blue Cross Blue Shield"
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="policy">Policy Number</Label>
                <Input
                  id="policy"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="group">Group Number</Label>
                <Input
                  id="group"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveInsurance} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Manage your account email and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  Your account email address
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/settings")}>
                Account Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
