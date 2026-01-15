import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Bell, 
  Moon, 
  Globe, 
  HelpCircle, 
  FileText, 
  Shield, 
  ChevronRight,
  Smartphone
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const navigate = useNavigate();

  const settingsSections = [
    {
      title: "Preferences",
      items: [
        { icon: Bell, label: "Push Notifications", hasSwitch: true, defaultChecked: true },
        { icon: Moon, label: "Dark Mode", hasSwitch: true, defaultChecked: false },
        { icon: Globe, label: "Language", value: "English" },
      ]
    },
    {
      title: "App",
      items: [
        { icon: Smartphone, label: "App Version", value: "1.0.0" },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Centre" },
        { icon: FileText, label: "Terms of Service" },
        { icon: Shield, label: "Privacy Policy" },
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
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </motion.div>
      </div>

      {/* Settings Sections */}
      <div className="px-6">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + sectionIndex * 0.1 }}
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
                  {item.hasSwitch ? (
                    <Switch defaultChecked={item.defaultChecked} />
                  ) : (
                    <div className="flex items-center gap-2">
                      {item.value && (
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Settings;
