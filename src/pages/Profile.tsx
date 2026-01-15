import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, CreditCard, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const navigate = useNavigate();

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: User, label: "Full Name", value: "Sarah Johnson" },
        { icon: Mail, label: "Email", value: "sarah@example.com" },
        { icon: Phone, label: "Phone", value: "+44 7700 900000" },
      ]
    },
    {
      title: "Payment",
      items: [
        { icon: CreditCard, label: "Linked Bank Account", value: "••••4532" },
      ]
    },
    {
      title: "Security",
      items: [
        { icon: Shield, label: "Password", value: "••••••••" },
      ]
    }
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      {/* Header */}
      <div className="px-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-4"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        </motion.div>
      </div>

      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex flex-col items-center px-6"
      >
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <User className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Sarah Johnson</h2>
        <p className="text-muted-foreground">sarah@example.com</p>
      </motion.div>

      {/* Profile Sections */}
      <div className="px-6">
        {profileSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + sectionIndex * 0.1 }}
            className="mb-6"
          >
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">{section.title}</h3>
            <div className="overflow-hidden rounded-2xl bg-card">
              {section.items.map((item, index) => (
                <button
                  key={item.label}
                  className={`flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent ${
                    index !== section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-8"
      >
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
          Delete Account
        </Button>
      </motion.div>
    </div>
  );
};

export default Profile;
