import type { CatalogueCitation } from '../repositories/types.js';
import type { Citation, EvidenceStatus, Interpretation, Match } from './domain.js';
import type { RankedMatch } from './ranking.js';
import { truncate, uniqueStrings } from './text.js';

const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  documented: 'udokumentowane w źródle',
  partially_documented: 'częściowo udokumentowane',
  synthetic: 'rekord syntetyczny (demonstracyjny)',
};

const RELEVANCE_NOTE =
  'Dopasowanie oznacza przydatność dla opisanego problemu, a nie gwarancję skuteczności ani dowód, że rozwiązanie działa.';

function toCitations(citations: CatalogueCitation[]): Citation[] {
  return citations.map((citation) => ({
    sourceId: citation.sourceId,
    title: citation.title,
    url: citation.url,
    page: citation.page,
    excerpt: truncate(citation.excerpt, 300),
  }));
}

/** Builds a grounded Polish explanation for one ranked recommendation. */
export function buildMatch(
  ranked: RankedMatch,
  interpretation: Interpretation,
  citations: CatalogueCitation[],
): Match {
  const { candidate, relevance } = ranked;
  const { innovation } = candidate;

  const whyItMatches: string[] = [];

  if (candidate.matchedNeedLabels.length > 0) {
    whyItMatches.push(
      `Odnosi się do zidentyfikowanych potrzeb: ${candidate.matchedNeedLabels.join(', ')}.`,
    );
  } else {
    whyItMatches.push('Opis rozwiązania częściowo pokrywa się z treścią zgłoszonego problemu.');
  }

  if (candidate.matchedTargetGroups.length > 0) {
    whyItMatches.push(`Profil odbiorców obejmuje: ${candidate.matchedTargetGroups.join(', ')}.`);
  } else if (interpretation.recipients.length > 0) {
    whyItMatches.push('Grupa docelowa rozwiązania może częściowo odpowiadać wskazanym odbiorcom.');
  } else {
    whyItMatches.push('Nie wskazano odbiorców, więc dopasowanie grup docelowych przyjęto neutralnie.');
  }

  if (candidate.matchedContexts.length > 0) {
    whyItMatches.push(`Kontekst zastosowania jest zgodny z: ${candidate.matchedContexts.join(', ')}.`);
  } else if (interpretation.localContext.length > 0) {
    whyItMatches.push('Kontekst lokalny może wymagać dostosowania opisanego modelu.');
  }

  whyItMatches.push(`Poziom udokumentowania: ${EVIDENCE_LABELS[innovation.evidenceStatus]}.`);

  const limitations: string[] = [];
  if (innovation.synthetic) {
    limitations.push(
      'To rekord demonstracyjny (syntetyczny). Nie potwierdzono jego skuteczności, kosztów ani rzeczywistego wdrożenia.',
    );
  }
  if (innovation.estimatedCostPln === null) {
    limitations.push('Nie podano kosztów — wysokość budżetu pozostaje nieznana.');
  }
  if (innovation.timeframeWeeks === null) {
    limitations.push('Nie podano czasu potrzebnego na wdrożenie.');
  }
  if (innovation.prerequisites.length > 0) {
    limitations.push(
      `Wymagania wstępne: ${innovation.prerequisites.join('; ')}. Ich spełnienie nie zostało zweryfikowane.`,
    );
  }
  if (candidate.targetGroupFit < 0.5 && interpretation.recipients.length > 0) {
    limitations.push('Grupa docelowa rozwiązania może różnić się od wskazanej w opisie problemu.');
  }
  if (candidate.contextFit < 0.5 && interpretation.localContext.length > 0) {
    limitations.push('Kontekst lokalny może wymagać adaptacji modelu.');
  }
  if (innovation.evidenceStatus !== 'documented') {
    limitations.push('Dokumentacja źródłowa jest niepełna; przed decyzją zalecana jest ręczna weryfikacja.');
  }
  limitations.push(RELEVANCE_NOTE);

  const suggestedNextSteps: string[] = [
    'Sugestia: potwierdź warunki wdrożenia bezpośrednio u autora lub podmiotu prowadzącego rozwiązanie.',
    'Sugestia: zaplanuj warsztat z użyciem Social Innovation Canvas, aby dostosować model do lokalnego kontekstu.',
    'Sugestia: zweryfikuj dostępny budżet, czas i zasoby, zanim podejmiesz decyzję.',
  ];
  if (innovation.synthetic) {
    suggestedNextSteps.push(
      'Sugestia: potraktuj ten rekord wyłącznie jako inspirację i poszukaj zweryfikowanych źródeł w Bibliotece Innowacji.',
    );
  }

  return {
    innovationId: innovation.id,
    title: innovation.title,
    summary: truncate(innovation.summary, 400),
    relevance,
    whyItMatches: uniqueStrings(whyItMatches),
    limitations: uniqueStrings(limitations),
    suggestedNextSteps: uniqueStrings(suggestedNextSteps),
    evidenceStatus: innovation.evidenceStatus,
    citations: toCitations(citations),
  };
}
