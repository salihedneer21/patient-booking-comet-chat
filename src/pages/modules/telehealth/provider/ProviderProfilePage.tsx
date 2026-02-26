import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Save,
  User,
  Briefcase,
  Languages,
  Plus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "French",
  "Arabic",
  "Hindi",
  "Portuguese",
  "Russian",
  "Japanese",
  "Korean",
];

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

export default function ProviderProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | undefined>();

  const providerProfile = useQuery(
    api.modules.telehealth.providers.getByUserId,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );

  const getOrCreateProfile = useMutation(api.modules.telehealth.providers.getOrCreateProfile);
  const updateBasicInfo = useMutation(api.modules.telehealth.providers.updateBasicInfo);
  const updateProfessionalInfo = useMutation(api.modules.telehealth.providers.updateProfessionalInfo);

  useEffect(() => {
    if (providerProfile) {
      setFirstName(providerProfile.firstName || "");
      setLastName(providerProfile.lastName || "");
      setBio(providerProfile.bio || "");
      setLanguagesSpoken(providerProfile.languagesSpoken || []);
      setPhone(providerProfile.phone || "");
      setYearsOfExperience(providerProfile.yearsOfExperience);
      // Handle license numbers
      if (providerProfile.licenseNumbers && providerProfile.licenseNumbers.length > 0) {
        setLicenseNumber(providerProfile.licenseNumbers[0].number);
        setLicenseState(providerProfile.licenseNumbers[0].state);
      }
    }
  }, [providerProfile]);

  if (userLoading || providerProfile === undefined) {
    return <FullPageSpinner />;
  }

  const handleAddLanguage = () => {
    if (newLanguage && !languagesSpoken.includes(newLanguage)) {
      setLanguagesSpoken([...languagesSpoken, newLanguage]);
      setNewLanguage("");
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    setLanguagesSpoken(languagesSpoken.filter((l) => l !== lang));
  };

  const handleSave = async () => {
    if (!user || !firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    setIsSaving(true);
    try {
      let profileId = providerProfile?._id;

      // Create profile if it doesn't exist
      if (!profileId) {
        profileId = await getOrCreateProfile({
          userId: user._id as Id<"users">,
          email: user.email || "",
          firstName,
          lastName,
        });
      }

      // Update basic info
      await updateBasicInfo({
        profileId,
        firstName,
        lastName,
        phone: phone || undefined,
      });

      // Update professional info
      await updateProfessionalInfo({
        profileId,
        bio: bio || undefined,
        languagesSpoken: languagesSpoken.length > 0 ? languagesSpoken : undefined,
        licenseNumbers:
          licenseNumber && licenseState
            ? [{ number: licenseNumber, state: licenseState }]
            : undefined,
        yearsOfExperience: yearsOfExperience,
      });

      toast.success("Profile saved successfully");
    } catch {
      toast.error("Failed to save profile");
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
          <h1 className="text-2xl font-bold">Provider Profile</h1>
          <p className="text-muted-foreground">
            {providerProfile ? "Update your profile" : "Complete your profile to get started"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Your name and contact information as displayed to patients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

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
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell patients about yourself, your experience, and approach to care..."
                className="mt-1"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Information
            </CardTitle>
            <CardDescription>
              Your licensing details and experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="licenseNumber">Medical License Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="licenseState">License State</Label>
                <Select value={licenseState} onValueChange={setLicenseState}>
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
            </div>

            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={yearsOfExperience ?? ""}
                onChange={(e) => setYearsOfExperience(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 10"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Languages Spoken
            </CardTitle>
            <CardDescription>
              Languages you can communicate with patients in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {languagesSpoken.map((lang) => (
                <Badge
                  key={lang}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {lang}
                  <button
                    onClick={() => handleRemoveLanguage(lang)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Select value={newLanguage} onValueChange={setNewLanguage}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add a language" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_LANGUAGES.filter((l) => !languagesSpoken.includes(l)).map(
                    (lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleAddLanguage}
                disabled={!newLanguage}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
