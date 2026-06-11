import { Button, Column, Label, Row, Slider, Switch, useToast } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useApi, useMessages, useModified } from '@/components/hooks';

interface AmplifierConfig {
  enabled: boolean;
  amplifyMultiplier: number;
  generateFakeVisits: boolean;
  fakeVisitsPerHour: number;
  amplifyPageviews: boolean;
  amplifyEvents: boolean;
  amplifyActiveUsers: boolean;
}

export function WebsiteAmplifierSettings({ websiteId }: { websiteId: string }) {
  const { get, post, useMutation, useQuery } = useApi();
  const { t, labels, messages } = useMessages();
  const { touch } = useModified();
  const { toast } = useToast();
  const { data, error, isLoading } = useQuery<AmplifierConfig>({
    queryKey: ['website:amplifier', websiteId],
    queryFn: () => get(`/websites/${websiteId}/amplifier`),
  });
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: AmplifierConfig) => post(`/websites/${websiteId}/amplifier`, payload),
  });
  const [enabled, setEnabled] = useState(false);
  const [amplifyMultiplier, setAmplifyMultiplier] = useState(10);
  const [generateFakeVisits, setGenerateFakeVisits] = useState(false);
  const [fakeVisitsPerHour, setFakeVisitsPerHour] = useState(50);

  useEffect(() => {
    if (!data) {
      return;
    }

    setEnabled(data.enabled);
    setAmplifyMultiplier(data.amplifyMultiplier);
    setGenerateFakeVisits(data.generateFakeVisits);
    setFakeVisitsPerHour(data.fakeVisitsPerHour);
  }, [data]);

  const handleSave = async () => {
    await mutateAsync({
      enabled,
      amplifyMultiplier,
      generateFakeVisits,
      fakeVisitsPerHour,
      amplifyPageviews: true,
      amplifyEvents: true,
      amplifyActiveUsers: true,
    });

    touch(`website:amplifier:${websiteId}`);
    toast(t(messages.saved));
  };

  return (
    <LoadingPanel data={data} isLoading={isLoading} error={error}>
      <Column gap="4">
        <Label>Data amplifier</Label>
        <Switch isSelected={enabled} onChange={setEnabled} isDisabled={isPending}>
          Show amplified analytics
        </Switch>
        <Slider
          label={`Multiplier: ${amplifyMultiplier}x`}
          minValue={1}
          maxValue={100}
          step={1}
          value={amplifyMultiplier}
          onChange={value => setAmplifyMultiplier(Array.isArray(value) ? value[0] : value)}
          isDisabled={!enabled || isPending}
          style={{ maxWidth: '360px' }}
        />
        <Switch
          isSelected={generateFakeVisits}
          onChange={setGenerateFakeVisits}
          isDisabled={!enabled || isPending}
        >
          Generate visits when there is no traffic
        </Switch>
        <Slider
          label={`Fake visits per hour: ${fakeVisitsPerHour}`}
          minValue={0}
          maxValue={1000}
          step={10}
          value={fakeVisitsPerHour}
          onChange={value => setFakeVisitsPerHour(Array.isArray(value) ? value[0] : value)}
          isDisabled={!enabled || !generateFakeVisits || isPending}
          style={{ maxWidth: '360px' }}
        />
        <Row>
          <Button variant="primary" onPress={handleSave} isDisabled={isPending}>
            {t(labels.save)}
          </Button>
        </Row>
      </Column>
    </LoadingPanel>
  );
}
