import { Redirect } from 'expo-router';

/** Legacy route: quick EQ check-in was removed. Send users to Home. */
export default function EqTabRedirect() {
  return <Redirect href="/(tabs)/home" />;
}
