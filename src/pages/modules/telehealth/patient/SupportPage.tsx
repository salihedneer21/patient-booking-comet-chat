import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

const FAQ_ITEMS = [
  {
    question: "How do I schedule an appointment?",
    answer: "You can schedule an appointment by clicking on 'Book Appointment' from your dashboard or the navigation menu. Select your preferred provider, choose an available date and time, and confirm your booking.",
  },
  {
    question: "How do I join a video call?",
    answer: "When your appointment time approaches (up to 15 minutes before), a 'Join Call' button will appear on your appointment card. Click it to enter the video call room. Make sure you have a stable internet connection and allow camera/microphone access when prompted.",
  },
  {
    question: "Can I cancel or reschedule an appointment?",
    answer: "Yes, you can cancel an appointment from your 'My Appointments' page. Click the 'Cancel' button on the appointment you wish to cancel. For rescheduling, please cancel the existing appointment and book a new one with your preferred time.",
  },
  {
    question: "How do I message my provider?",
    answer: "Navigate to the 'Messages' section from your dashboard. You can start a new conversation with any of your providers or continue existing conversations. Your provider will respond as soon as they are available.",
  },
  {
    question: "Where can I view my health records?",
    answer: "Your health records are available in the 'Health Records' section. Here you can view your medical conditions, current medications, allergies, and past visit summaries.",
  },
  {
    question: "How do I update my insurance information?",
    answer: "Go to 'My Profile' and scroll to the Insurance Information section. You can update your insurance provider, policy number, and group number there.",
  },
  {
    question: "Is my health information secure?",
    answer: "Yes, we take your privacy seriously. All your health information is encrypted and stored securely in compliance with HIPAA regulations. We never share your information without your consent.",
  },
  {
    question: "What if I'm having technical difficulties during a video call?",
    answer: "First, try refreshing your browser. Make sure you have a stable internet connection and that your camera/microphone permissions are enabled. If issues persist, try joining from a different browser or device. You can also contact our support team for immediate assistance.",
  },
  {
    question: "How do I prepare for my telehealth appointment?",
    answer: "Find a quiet, private space with good lighting. Test your camera and microphone beforehand. Have a list of your current medications and any questions for your provider ready. Join the call a few minutes early to ensure everything is working properly.",
  },
  {
    question: "Can I get prescriptions through telehealth?",
    answer: "Yes, providers can prescribe medications when clinically appropriate during telehealth visits. Prescriptions are sent electronically to your preferred pharmacy. Note that some medications may require an in-person visit.",
  },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFAQs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Message sent! We'll get back to you soon.");
    setContactName("");
    setContactEmail("");
    setContactMessage("");
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground">Get answers and assistance</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Cards */}
        <div className="lg:col-span-3 grid gap-4 sm:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Call Us</p>
                <p className="text-sm text-muted-foreground">1-800-TELEHEALTH</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@telehealth.com</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Live Chat</p>
                <p className="text-sm text-muted-foreground">Available 24/7</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Find quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredFAQs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No matching questions found
                </p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQs.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>
                Send us a message and we'll respond within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Emergency Notice */}
          <Card className="mt-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-800">
                <strong>Medical Emergency?</strong>
                <br />
                If you're experiencing a medical emergency, please call 911 or go to your nearest emergency room immediately.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Resources */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="#"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Privacy Policy</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Terms of Service</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">HIPAA Notice</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Accessibility</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
