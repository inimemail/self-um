import { Button, Column, Label, ListItem, Row, Select, Slider, Switch, useToast } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useApi, useMessages, useModified } from '@/components/hooks';

type TrafficTemplate = 'blog' | 'forum' | 'general' | 'movie' | 'shop';

interface AmplifierConfig {
  enabled: boolean;
  amplifyMultiplier: number;
  generateFakeVisits: boolean;
  fakeVisitsPerHour: number;
  trafficTemplate: TrafficTemplate;
  amplifyPageviews: boolean;
  amplifyEvents: boolean;
  amplifyActiveUsers: boolean;
}

const TRAFFIC_TEMPLATES: Array<{ id: TrafficTemplate; label: string }> = [
  { id: 'movie', label: '影视站' },
  { id: 'blog', label: '博客站' },
  { id: 'shop', label: '电商站' },
  { id: 'forum', label: '论坛社区' },
  { id: 'general', label: '通用站' },
];

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
  const [trafficTemplate, setTrafficTemplate] = useState<TrafficTemplate>('general');

  useEffect(() => {
    if (!data) {
      return;
    }

    setEnabled(data.enabled);
    setAmplifyMultiplier(data.amplifyMultiplier);
    setGenerateFakeVisits(data.generateFakeVisits);
    setFakeVisitsPerHour(data.fakeVisitsPerHour);
    setTrafficTemplate(data.trafficTemplate || 'general');
  }, [data]);

  const handleSave = async () => {
    await mutateAsync({
      enabled,
      amplifyMultiplier,
      generateFakeVisits,
      fakeVisitsPerHour,
      trafficTemplate,
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
        <Label>数据放大</Label>
        <Switch isSelected={enabled} onChange={setEnabled} isDisabled={isPending}>
          显示放大后的统计数据
        </Switch>
        <Slider
          label={`显示倍数：${amplifyMultiplier} 倍`}
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
          没有真实访问时自动补访问
        </Switch>
        <Select
          label="流量模板"
          value={trafficTemplate}
          onChange={value => setTrafficTemplate(value as TrafficTemplate)}
          isDisabled={!enabled || !generateFakeVisits || isPending}
          style={{ maxWidth: '360px' }}
        >
          {TRAFFIC_TEMPLATES.map(({ id, label }) => (
            <ListItem key={id} id={id}>
              {label}
            </ListItem>
          ))}
        </Select>
        <Slider
          label={`每小时补访问：${fakeVisitsPerHour}`}
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
