import type {
  Question,
  ResponseRecord,
  QuestionPresentation,
} from "../domain/types";
/** Pure evidence contract; persistence belongs to the anonymous browser store. */
export interface JoinedAttempt {
  response: ResponseRecord;
  presentation: QuestionPresentation;
  question: Question;
}
