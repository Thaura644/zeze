export type SubscriptionTier = 'free' | 'basic' | 'premium';

export interface PlanFeature {
  name: string;
  included: SubscriptionTier[];
}

export const PLANS = {
  free: {
    name: 'Free',
    limitations: {
      dailyProcesses: 1,
      hasStems: false,
      hasAdvancedAI: false,
    }
  },
  basic: {
    name: 'Basic',
    limitations: {
      dailyProcesses: 5,
      hasStems: false,
      hasAdvancedAI: true,
    }
  },
  premium: {
    name: 'Premium',
    limitations: {
      dailyProcesses: 100,
      hasStems: true,
      hasAdvancedAI: true,
    }
  }
};

export const isFeatureEnabled = (tier: SubscriptionTier, feature: keyof typeof PLANS['free']['limitations']) => {
  return PLANS[tier].limitations[feature];
};
