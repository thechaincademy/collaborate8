import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, CreditCard, Shield, ChevronRight, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useBanking } from "@/hooks/useBanking";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const { connection, fetchConnection } = useBanking();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchConnection();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "User";
  const email = user?.email || "";

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: User, label: "Full Name", value: fullName },
        { icon: Mail, label: "Email", value: email },
      ],
    },
    {
      title: "Co-Parent",
      items: [
        {
          icon: Users,
          label: "Status",
          value: profile?.coparent_id ? "Connected" : "Not connected",
        },
      ],
    },
    {
      title: "Bank Account",
      items: [
        {
          icon: Building2,
          label: "Linked Bank",
          value: connection
            ? `${connection.institution_name} ${connection.account_number_masked || ""}`
            : "Not connected",
          action: !connection ? () => navigate("/post-signup?step=bank") : undefined,
          actionLabel: !connection ? "Link" : undefined,
        },
        {
          icon: CreditCard,
          label: "Status",
          value: connection?.consent_status === "active" ? "Active" : "Not linked",
        },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: Shield, label: "Role", value: profile?.role === "managing" ? "Managing Parent" : "Viewing Parent" },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <div className="px-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-4"
        >
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex flex-col items-center px-6"
      >
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <User className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
        <p className="text-muted-foreground">{email}</p>
        <p className="mt-1 text-xs text-muted-foreground capitalize">
          {profile?.role === "managing" ? "Managing Parent" : "Viewing Parent"}
        </p>
      </motion.div>

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
                <div
                  key={item.label}
                  className={`flex w-full items-center justify-between p-4 ${
                    index !== section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-8"
      >
        <Button onClick={handleSignOut} variant="outline" className="mb-3 w-full">
          Sign Out
        </Button>
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
          Delete Account
        </Button>
      </motion.div>
    </div>
  );
};

export default Profile;
