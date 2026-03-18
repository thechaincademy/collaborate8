import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, CreditCard, Shield, Users, Building2, Check, AlertTriangle, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useBanking } from "@/hooks/useBanking";
import { useStripePayments, useStripeConnect } from "@/hooks/useStripe";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const { connection, fetchConnection } = useBanking();
  const { signOut } = useAuth();
  const { cards, fetchCards, setupCard, loading: stripeLoading } = useStripePayments();
  const { checkAccountStatus, startOnboarding, loading: connectLoading } = useStripeConnect();
  const [connectStatus, setConnectStatus] = useState<string>("not_created");

  useEffect(() => {
    fetchConnection();
    fetchCards();
    checkAccountStatus().then((s) => {
      if (s) setConnectStatus(s.status);
    });
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
  const isManaging = profile?.role === "managing";
  const isViewing = profile?.role === "viewing";

  const handleSetupCard = async () => {
    const result = await setupCard();
    if (result?.url) window.open(result.url, "_blank");
  };

  const handleConnectOnboarding = async () => {
    const result = await startOnboarding();
    if (result?.url) window.open(result.url, "_blank");
  };

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
    // Payment Card section (for payer / managing parent)
    ...(isManaging
      ? [
          {
            title: "Payment Card",
            items: cards.length > 0
              ? cards.map((c) => ({
                  icon: CreditCard,
                  label: `${c.brand.charAt(0).toUpperCase() + c.brand.slice(1)}`,
                  value: `****${c.last4} (${c.expMonth}/${c.expYear})`,
                }))
              : [
                  {
                    icon: CreditCard,
                    label: "Card",
                    value: "Not added",
                    action: handleSetupCard,
                    actionLabel: "Add Card",
                  },
                ],
          },
        ]
      : []),
    // Payout Account section (for receiver / viewing parent)
    ...(isViewing
      ? [
          {
            title: "Payout Account",
            items: [
              {
                icon: CreditCard,
                label: "Stripe Connect",
                value:
                  connectStatus === "complete"
                    ? "Active"
                    : connectStatus === "pending_capabilities"
                      ? "Under review"
                      : connectStatus === "pending"
                        ? "Pending"
                        : "Not set up",
                sublabel:
                  connectStatus === "pending_capabilities"
                    ? "Verification may take a few minutes or hours"
                    : undefined,
                action: connectStatus === "not_created" || connectStatus === "pending" ? handleConnectOnboarding : undefined,
                actionLabel: connectStatus === "not_created" || connectStatus === "pending" ? "Set Up" : undefined,
              },
            ],
          },
        ]
      : []),
    // Open Banking (Coming Soon)
    {
      title: "Open Banking",
      items: [
        {
          icon: Building2,
          label: "Bank Account",
          value: connection
            ? `${connection.institution_name} ${connection.account_number_masked || ""}`
            : "Not connected",
          comingSoon: true,
        },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: Shield, label: "Role", value: isManaging ? "Managing Parent" : "Viewing Parent" },
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
          <button onClick={() => { if (window.history.length > 2) { navigate(-1); } else { navigate("/dashboard"); } }} className="flex h-10 w-10 items-center justify-center">
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
          {isManaging ? "Managing Parent" : "Viewing Parent"}
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
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {section.title}
              {section.items.some((i: any) => i.comingSoon) && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Coming Soon
                </span>
              )}
            </h3>
            <div className="overflow-hidden rounded-2xl bg-card">
              {section.items.map((item: any, index: number) => (
                <div
                  key={item.label + index}
                  className={`flex w-full items-center justify-between p-4 ${
                    index !== section.items.length - 1 ? "border-b border-border" : ""
                  } ${item.comingSoon ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                      {item.sublabel && (
                        <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                      )}
                    </div>
                    {item.action && !item.comingSoon && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={item.action}
                        className="ml-2 h-7 text-xs"
                        disabled={stripeLoading || connectLoading}
                      >
                        {item.actionLabel || "Go"}
                      </Button>
                    )}
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
