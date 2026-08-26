/**
 * ItineraryRecommendationService - service boundary reserved for future AI.
 *
 * THIS IS NOT CALLED BY THE PRODUCTION WORKFLOW. In this MVP the human admin is
 * the recommendation engine, deliberately: the first clients are the source of
 * truth about what should eventually be automated.
 *
 * It exists so that when matching is built, the Component model already exposes
 * everything a matcher needs (tags, module, catalogue, descriptions, vendor)
 * and the call site is obvious. `NullRecommendationService` is the shipped
 * implementation and returns nothing.
 */

export type RecommendationSignals = {
  clientId: string;
  healthInterests: string | null;
  wellnessInterests: string | null;
  culturalInterests: string | null;
  generalPreferences: string | null;
  tripDurationDays: number | null;
};

export type ComponentCandidate = {
  componentId: string;
  name: string;
  moduleName: string;
  catalogueName: string;
  vendorName: string;
  tags: string[];
  clientFacingDescription: string;
};

export type Recommendation = {
  componentId: string;
  /** 0..1 */
  score: number;
  /** Human-readable justification, shown to the admin, never to the client. */
  rationale: string;
};

export interface ItineraryRecommendationService {
  readonly name: string;
  recommend(
    signals: RecommendationSignals,
    candidates: ComponentCandidate[],
  ): Promise<Recommendation[]>;
}

export class NullRecommendationService implements ItineraryRecommendationService {
  readonly name = "null";

  async recommend(): Promise<Recommendation[]> {
    return [];
  }
}

let service: ItineraryRecommendationService = new NullRecommendationService();

export function getRecommendationService(): ItineraryRecommendationService {
  return service;
}

export function setRecommendationService(next: ItineraryRecommendationService) {
  service = next;
}
