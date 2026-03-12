import { useOnboarding } from '@/providers/OnboardingProvider';

/**
 * Returns copy variants that adapt to whether the user is a solo planner
 * or a multi-person household. Read household_size from onboarding data,
 * which is set in Step 3 and is available for all subsequent steps.
 *
 * Usage:
 *   const { possessive, noneLabel, isSolo } = useHouseholdCopy();
 *   <Text>Which cuisines does {possessive} love?</Text>
 *   <NoneButton label={noneLabel} onPress={handleNone} />
 */
export function useHouseholdCopy() {
  const { data } = useOnboarding();
  const isSolo = data.household_size === 1;

  return {
    isSolo,

    // "you" vs "your household"
    subject: isSolo ? 'you' : 'your household',

    // "your" vs "your household's"
    possessive: isSolo ? 'your' : "your household's",

    // For headings: "you" vs "your household"
    // e.g. "Which cuisines do you love?" vs "Which cuisines does your household love?"
    headingSubject: isSolo ? 'you' : 'your household',

    // None / skip button label
    // e.g. "None of these apply to me" vs "None of these apply to us"
    noneLabel: isSolo ? 'None of these apply to me' : 'None of these apply to us',

    // For dietary screens
    // e.g. "No allergies or intolerances for me" vs "No allergies or intolerances for us"
    noIntolerancesLabel: isSolo ? 'No allergies or intolerances' : 'No allergies or intolerances',

    // "I follow" vs "We follow"
    followVerb: isSolo ? 'I follow' : 'We follow',

    // "me" vs "us"
    object: isSolo ? 'me' : 'us',
  };
}
