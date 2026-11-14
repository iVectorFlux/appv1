import { Redirect } from 'expo-router';
import { useEqTestAvailability } from '@/hooks/useEqTestAvailability';

/** Tab route wrapper forwarding directly to EQ Test when unlocked, or Home otherwise. */
export default function EqTabRedirect() {
  const { availability } = useEqTestAvailability();
  if (availability.isAvailable) {
    return <Redirect href={availability.route as never} />;
  }
  return <Redirect href="/(tabs)/home" />;
}
