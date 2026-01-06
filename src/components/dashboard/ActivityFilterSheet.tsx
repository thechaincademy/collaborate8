import { Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface ActivityFilterSheetProps {
  children: React.ReactNode;
  filter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: "all", label: "Show All" },
  { id: "account", label: "Show account activity" },
  { id: "envelopes", label: "Show envelopes activity" },
  { id: "recurring", label: "Show reoccurring payments" },
];

const ActivityFilterSheet = ({ children, filter, onFilterChange }: ActivityFilterSheetProps) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="px-6 pb-8">
        <div className="mb-6 mt-4">
          <h2 className="text-2xl font-bold text-foreground">Activity</h2>
        </div>
        <div className="space-y-0">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className="flex w-full items-center justify-between border-b border-border py-4"
            >
              <span className="text-foreground">{f.label}</span>
              {filter === f.id && <Check className="h-5 w-5 text-foreground" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ActivityFilterSheet;
