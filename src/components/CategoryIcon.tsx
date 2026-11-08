import {
  Amphora, Boxes, BrickWall, Cpu, FlaskConical, Package, Shirt, Sofa, Sparkles, Trees, Wheat, Wine, Wrench, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wine: Wine, sofa: Sofa, shirt: Shirt, "brick-wall": BrickWall, package: Package, wrench: Wrench, trees: Trees,
  amphora: Amphora, "flask-conical": FlaskConical, cpu: Cpu, sparkles: Sparkles, wheat: Wheat, boxes: Boxes,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Boxes;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.6} />;
}
