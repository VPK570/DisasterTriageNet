import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VictimCard from '@/components/VictimCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function VictimCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-slate-950 p-4">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Button>
      </div>
      <VictimCard victimId={id} />
    </div>
  );
}