import { useState } from "react";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const repeatOptions = ["Daily", "Weekly", "Monthly"];
const days = Array.from({ length: 30 }, (_, i) => i + 1);
const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const EditRecurringPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReceiving = searchParams.get("type") === "receiving";
  
  const [amount, setAmount] = useState("50.00");
  const [repeat, setRepeat] = useState("Monthly");
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedWeekday, setSelectedWeekday] = useState("Mo");

  const handleKeyPress = (digit: string) => {
    if (digit === "delete") {
      setAmount(prev => {
        const newVal = prev.replace(".", "").slice(0, -1) || "0";
        const num = parseInt(newVal, 10);
        return (num / 100).toFixed(2);
      });
    } else {
      setAmount(prev => {
        const current = prev.replace(".", "");
        const newVal = current + digit;
        const num = parseInt(newVal, 10);
        return (num / 100).toFixed(2);
      });
    }
  };

  const getRepeatLabel = () => {
    if (repeat === "Daily") return "Daily";
    if (repeat === "Weekly") {
      const dayName = selectedWeekday === "Mo" ? "Monday" : selectedWeekday === "Tu" ? "Tuesday" : 
        selectedWeekday === "We" ? "Wednesday" : selectedWeekday === "Th" ? "Thursday" : 
        selectedWeekday === "Fr" ? "Friday" : selectedWeekday === "Sa" ? "Saturday" : "Sunday";
      return `Weekly on ${dayName}`;
    }
    return `Monthly on ${selectedDay}`;
  };

  const handleSave = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-card">
      <div className="px-6 pt-12">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <button onClick={handleSave} className="font-medium text-foreground">
            Save
          </button>
        </div>

        <h1 className="mb-8 text-2xl font-bold text-foreground">Reoccurring payment</h1>

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-background p-4">
          <div>
            <p className="font-semibold text-foreground">Medi8 Account</p>
            <p className="text-sm text-muted-foreground">£ 1,546.00</p>
          </div>
          <p className="text-lg font-semibold text-foreground">£ {amount}</p>
        </div>

        <Drawer>
          <DrawerTrigger asChild>
            <button className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-background p-4">
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Repeat</p>
                <p className="font-medium text-foreground">{getRepeatLabel()}</p>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="px-6 pb-8">
            <div className="mb-6 mt-4">
              <h2 className="text-2xl font-bold text-foreground">Repeat</h2>
            </div>
            {repeatOptions.map((option) => (
              <button
                key={option}
                onClick={() => setRepeat(option)}
                className="flex w-full items-center justify-between border-b border-border py-4"
              >
                <span className="text-foreground">{option}</span>
                {repeat === option && <Check className="h-5 w-5 text-foreground" />}
              </button>
            ))}
          </DrawerContent>
        </Drawer>

        <div className="mb-4 rounded-2xl border border-border bg-background p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            {repeat === "Weekly" ? `On ${selectedWeekday === "Mo" ? "Monday" : selectedWeekday}` : `On ${selectedDay}`}
          </p>
          
          {repeat === "Weekly" ? (
            <div className="flex gap-2">
              {weekdays.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedWeekday(day)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    selectedWeekday === day
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          ) : repeat !== "Daily" && (
            <div className="grid grid-cols-6 gap-2">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    selectedDay === day
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto px-6 pb-12">
        <Button variant="outline" className="w-full" size="lg">
          Cancel This Payment
        </Button>
      </div>

      {repeat === "Monthly" && (
        <div className="fixed bottom-32 left-0 right-0 px-6">
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
              <button
                key={i}
                onClick={() => key && handleKeyPress(key)}
                className={`flex h-14 items-center justify-center rounded-xl text-xl font-medium ${
                  key === "" ? "" : "bg-muted text-foreground active:bg-muted/70"
                }`}
              >
                {key === "delete" ? "⌫" : key}
                {["2", "3", "4", "5", "6", "7", "8", "9"].includes(key) && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {key === "2" ? "ABC" : key === "3" ? "DEF" : key === "4" ? "GHI" :
                     key === "5" ? "JKL" : key === "6" ? "MNO" : key === "7" ? "PQRS" :
                     key === "8" ? "TUV" : "WXYZ"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRecurringPayment;
