import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

interface AboutEnvelopesSheetProps {
  children: React.ReactNode;
}

const AboutEnvelopesSheet = ({ children }: AboutEnvelopesSheetProps) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <div className="flex h-full flex-col px-6 pb-8">
          <div className="mb-8 mt-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-card">
              <Image className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          
          <h2 className="mb-4 text-3xl font-bold text-foreground">About payments</h2>
          
          <p className="flex-1 text-muted-foreground leading-relaxed">
            Set aside money for your child's regular costs and keep track of what has been paid and received, so both parents can see where things stand.
          </p>
          
          <DrawerClose asChild>
            <Button className="mt-8 w-auto self-start" size="lg">
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AboutEnvelopesSheet;
