import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { openApiDocument } from './openapi.js';

interface OpenApiShape {
  openapi: string;
  paths: Record<string, unknown>;
  components: { schemas: Record<string, unknown> };
}

const doc = openApiDocument as unknown as OpenApiShape;

describe('openApiDocument', () => {
  test('declares the OpenAPI 3.x version', () => {
    assert.equal(typeof doc.openapi, 'string');
    assert.ok(doc.openapi.startsWith('3.'), `unexpected version ${doc.openapi}`);
  });

  test('documents the required paths', () => {
    for (const path of [
      '/api/v1/matchmaking',
      '/api/v1/innovations',
      '/api/v1/innovations/{innovationId}',
      '/api/v1/matchmaking/{requestId}/feedback',
      '/api/v1/tests',
      '/api/v1/tests/{testId}',
      '/api/v1/tests/{testId}/applications',
      '/api/v1/tester/applications',
      '/api/v1/tester/applications/{applicationId}/feedback',
      '/api/v1/innovations/{innovationId}/tester-feedback',
      '/api/v1/problem-reports',
      '/api/v1/problem-reports/{reportId}',
      '/api/v1/admin/stats',
      '/api/v1/admin/submissions',
      '/api/v1/admin/submissions/{submissionId}',
      '/api/assistant/messages',
      '/api/assistant/searches/{searchId}',
    ]) {
      assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, path), `missing path ${path}`);
    }
  });

  test('declares the required component schemas', () => {
    const schemas = doc.components.schemas;
    for (const schema of [
      'MatchmakingRequest',
      'MatchmakingResponse',
      'InnovationDetail',
      'InnovationSummary',
      'InnovationListResponse',
      'FeedbackRequest',
      'InnovationTest',
      'TestApplication',
      'TesterFeedbackRequest',
      'TesterFeedback',
      'TesterFeedbackAggregate',
      'ProblemReport',
      'ProblemReportRequest',
      'ProblemReportUpdateRequest',
      'ProblemReportListResponse',
      'AdminStats',
      'AdminSubmission',
      'AdminSubmissionListResponse',
      'AdminSubmissionUpdateRequest',
      'SendAssistantMessageRequest',
      'SendAssistantMessageResponse',
      'ClarificationResponse',
      'RecommendationsResponse',
      'AssistantMessageResponse',
      'Recommendation',
      'Pagination',
      'SearchPageResponse',
      'ErrorEnvelope',
    ]) {
      assert.ok(Object.prototype.hasOwnProperty.call(schemas, schema), `missing schema ${schema}`);
    }
  });
});
