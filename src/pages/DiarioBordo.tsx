import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileDiarioAircraftSelector } from '@/components/diario/MobileDiarioAircraftSelector';
import { MobileDiarioEntryForm } from '@/components/diario/MobileDiarioEntryForm';

type FlowStep = 'select-aircraft' | 'new-entry';

const DiarioBordo = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>('select-aircraft');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [selectedAircraftReg, setSelectedAircraftReg] = useState<string>('');
  const [selectedAircraftImage, setSelectedAircraftImage] = useState<string | null>(null);

  const handleSelectAircraft = (id: string, registration: string, imageUrl: string | null) => {
    setSelectedAircraftId(id);
    setSelectedAircraftReg(registration);
    setSelectedAircraftImage(imageUrl);
    setStep('new-entry');
  };

  const handleBack = () => {
    if (step === 'new-entry') {
      setStep('select-aircraft');
      setSelectedAircraftId(null);
      setSelectedAircraftReg('');
      setSelectedAircraftImage(null);
    } else {
      navigate('/');
    }
  };

  const handleSaved = () => {
    setStep('select-aircraft');
    setSelectedAircraftId(null);
    setSelectedAircraftReg('');
    setSelectedAircraftImage(null);
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
          aircraftImageUrl={selectedAircraftImage}
          onBack={handleBack}
          onSaved={handleSaved}
        />
      )}
    </MobileLayout>
  );
};

export default DiarioBordo;
