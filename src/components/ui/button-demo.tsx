import { Button } from '@/components/ui/button-1';
import { Bell, CalendarCheck, Trash2 } from 'lucide-react';

export default function ButtonDemo() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="primary">
        <Trash2 /> Primary
      </Button>
      <Button variant="outline">
        <Bell /> Outline
      </Button>
      <Button variant="ghost">
        <CalendarCheck /> Ghost
      </Button>
    </div>
  );
}
