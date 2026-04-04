import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

export default function LegacyFutureSkillsDetail() {
  const params = useLocalSearchParams<{ skillId: string; returnTo?: string | string[] }>();
  const { skillId } = params;
  const ret = params.returnTo;
  const r = Array.isArray(ret) ? ret[0] : ret;
  const suffix = r ? `?returnTo=${encodeURIComponent(r)}` : '';
  if (!skillId) return <Redirect href="/skill-lab" />;
  return <Redirect href={`/skill-lab/${skillId}${suffix}` as Href} />;
}
