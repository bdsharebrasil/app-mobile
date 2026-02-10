import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileDiarioAircraftSelector } from '@/components/diario/MobileDiarioAircraftSelector';
import { MobileDiarioEntryForm } from '@/components/diario/MobileDiarioEntryForm';

interface DiarioBordoProps {
  aircraftId?: string | null;
  onBack?: () => void;
}

type FlowStep = 'select-aircraft' | 'new-entry';

const DiarioBordo: React.FC<DiarioBordoProps> = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>('select-aircraft');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [selectedAircraftReg, setSelectedAircraftReg] = useState<string>('');

  const handleSelectAircraft = (id: string, registration: string) => {
    setSelectedAircraftId(id);
    setSelectedAircraftReg(registration);
    setStep('new-entry');
  };

  const handleBack = () => {
    if (step === 'new-entry') {
      setStep('select-aircraft');
      setSelectedAircraftId(null);
    } else {
      navigate('/');
    }
  };

  const handleSaved = () => {
    setStep('select-aircraft');
    setSelectedAircraftId(null);
  };

  return (
    <MobileLayout hideTabBar={step === 'new-entry'}>
      {step === 'select-aircraft' && (
        <MobileDiarioAircraftSelector
          onSelect={handleSelectAircraft}
          onBack={() => navigate('/')}
        />
      )}
      {step === 'new-entry' && selectedAircraftId && (
        <MobileDiarioEntryForm
          aircraftId={selectedAircraftId}
          aircraftRegistration={selectedAircraftReg}
          onBack={handleBack}
          onSaved={handleSaved}
        />
      )}
    </MobileLayout>
  );
};

export default DiarioBordo;
