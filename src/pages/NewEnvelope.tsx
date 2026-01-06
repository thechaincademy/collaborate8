import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Image, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const styles = [
  { id: 1, name: "Style 1" },
  { id: 2, name: "Style 2" },
  { id: 3, name: "Style 3" },
];

const repeatOptions = ["Don't repeat", "Daily", "Weekly", "Monthly"];
const days = Array.from({ length: 30 }, (_, i) => i + 1);
const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Step = "name" | "addMoney";

const NewEnvelope = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(1);
  const [amount, setAmount] = useState("0.00");
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

  const handleContinue = () => {
    if (step === "name" && name.trim()) {
      setStep("addMoney");
    }
  };

  const handleDone = () => {
    navigate("/dashboard");
  };

  const getRepeatLabel = () => {
    if (repeat === "Don't repeat") return "Don't repeat";
    if (repeat === "Daily") return "Daily";
    if (repeat === "Weekly") return `Weekly on ${selectedWeekday === "Mo" ? "Monday" : selectedWeekday === "Tu" ? "Tuesday" : selectedWeekday === "We" ? "Wednesday" : selectedWeekday === "Th" ? "Thursday" : selectedWeekday === "Fr" ? "Friday" : selectedWeekday === "Sa" ? "Saturday" : "Sunday"}`;
    return `Monthly on ${selectedDay}`;
  };

  if (step === "addMoney") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="px-6 pt-12">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={() => setStep("name")}>
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
            <button onClick={handleDone} className="text-foreground">
              Skip
            </button>
          </div>

          <h1 className="mb-8 text-2xl font-bold text-foreground">Add money</h1>

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="font-semibold text-foreground">Medi8 Account</p>
              <p className="text-sm text-muted-foreground">£ 1,546.00</p>
            </div>
            <p className="text-lg font-semibold text-foreground">£ {amount}</p>
          </div>

          <Drawer>
            <DrawerTrigger asChild>
              <button className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4">
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

          {repeat !== "Don't repeat" && (
            <div className="mb-4 rounded-2xl border border-border bg-card p-4">
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
              ) : (
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
          )}
        </div>

        {repeat === "Don't repeat" || repeat === "Weekly" ? (
          <div className="mt-auto px-6 pb-12">
            <Button className="w-full" size="lg" onClick={handleDone}>
              Done
            </Button>
          </div>
        ) : (
          <div className="mt-auto px-6">
            <Button className="mb-6 w-full" size="lg" onClick={handleDone}>
              Done
            </Button>

            <div className="grid grid-cols-3 gap-2 pb-8">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => key && handleKeyPress(key)}
                  className={`flex h-14 items-center justify-center rounded-xl text-xl font-medium ${
                    key === "" ? "" : "bg-card text-foreground active:bg-muted"
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
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        {/* Style Carousel */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {styles.map((style, index) => (
            <motion.button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`flex items-center justify-center rounded-2xl bg-card transition-all ${
                selectedStyle === style.id
                  ? "h-32 w-32"
                  : "h-20 w-20 opacity-50"
              }`}
              animate={{
                scale: selectedStyle === style.id ? 1 : 0.7,
              }}
            >
              <Image className={`text-muted-foreground ${
                selectedStyle === style.id ? "h-16 w-16" : "h-10 w-10"
              }`} />
            </motion.button>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex justify-center gap-2">
          {styles.map((style) => (
            <div
              key={style.id}
              className={`h-1 rounded-full transition-all ${
                selectedStyle === style.id
                  ? "w-8 bg-foreground"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Envelope name"
          className="mb-6 border-0 bg-transparent text-center text-xl placeholder:text-muted-foreground focus-visible:ring-0"
        />
      </div>

      <div className="mt-auto px-6 pb-12">
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleContinue}
          disabled={!name.trim()}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default NewEnvelope;
