import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Receiving Parent",
    content: "Finally, a platform that understands what separated families actually need. The expense tracking alone has saved us countless arguments.",
    rating: 5
  },
  {
    name: "James T.",
    role: "Paying Parent",
    content: "The payment reminders and direct bank transfer feature give me peace of mind. I know exactly where my money is going and when.",
    rating: 5
  },
  {
    name: "Michelle R.",
    role: "Receiving Parent",
    content: "After years of dealing with missed payments and CMS fees, Medi8 feels like a breath of fresh air. Highly recommend.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section className="relative overflow-hidden bg-background py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Testimonials
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Trusted by Families
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
            Real parents sharing their experience with Medi8
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="relative rounded-2xl bg-card p-8 shadow-soft"
            >
              <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/10" />
              
              {/* Stars */}
              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                ))}
              </div>

              <p className="mb-6 text-foreground leading-relaxed">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary font-semibold text-primary-foreground">
                  {testimonial.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
