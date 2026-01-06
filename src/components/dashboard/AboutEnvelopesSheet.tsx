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
          
          <h2 className="mb-4 text-3xl font-bold text-foreground">About envelopes</h2>
          
          <p className="flex-1 text-muted-foreground leading-relaxed">
            Pretium pretium aliquam vitae rutrum. Suspendisse pellentesque suspendisse 
            interdum tristique non, commodo ut amet. Adipiscing nibh urna auctor at eget vitae 
            aenean ut pellentesque. Aliquam euismod magnis a amet ut mattis. Blandit purus eget 
            pulvinar rhoncus, dignissim condimentum facilisis. Pulvinar ac bibendum fermentum 
            metus lorem dui id. Lectus suscipit feugiat dis eget. Rutrum magnis egestas duis tellus 
            gravida varius est cras facilisis.
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
