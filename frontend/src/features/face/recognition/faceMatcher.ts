import { FaceRecognitionEmployee } from "../../../services/api"

/**
 * Standard calibrated cosine similarity threshold for SFace 128-D normalized embeddings.
 * SFace intra-person cosine similarity is typically >= 0.40 - 0.70.
 * Inter-person (different people) cosine similarity is typically <= 0.20 - 0.35.
 * Setting threshold at 0.42 gives robust separation while avoiding false rejects.
 */
export const DEFAULT_RECOGNITION_THRESHOLD = 0.42

/**
 * Compute cosine similarity between two 128-D L2-normalized vectors.
 * Since both vectors have Euclidean norm 1, cosine similarity is simply the dot product.
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0
  }
  let dotProduct = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
  }
  return dotProduct
}

export interface MatchCandidateResult {
  employee: FaceRecognitionEmployee | null
  maxSimilarity: number
  allSimilarities: { employee_id: string; name: string; score: number }[]
  isMatch: boolean
}

/**
 * Match a live 128-D normalized face embedding against registered employee templates.
 * Returns the candidate with the highest similarity score exceeding the threshold.
 */
export function findMatchingEmployee(
  liveEmbedding: number[],
  registeredEmployees: FaceRecognitionEmployee[],
  threshold: number = DEFAULT_RECOGNITION_THRESHOLD
): MatchCandidateResult {
  if (registeredEmployees.length === 0) {
    return {
      employee: null,
      maxSimilarity: 0,
      allSimilarities: [],
      isMatch: false,
    }
  }

  let bestMatch: FaceRecognitionEmployee | null = null
  let highestScore = -1
  const allSimilarities: { employee_id: string; name: string; score: number }[] = []

  for (const emp of registeredEmployees) {
    let empMaxScore = -1

    // Compare against each of the registered samples for this employee
    for (const sampleEmbedding of emp.embeddings) {
      const score = computeCosineSimilarity(liveEmbedding, sampleEmbedding)
      if (score > empMaxScore) {
        empMaxScore = score
      }
    }

    allSimilarities.push({
      employee_id: emp.employee_id,
      name: emp.name,
      score: empMaxScore,
    })

    if (empMaxScore > highestScore) {
      highestScore = empMaxScore
      bestMatch = emp
    }
  }

  const isMatch = highestScore >= threshold && bestMatch !== null

  return {
    employee: isMatch ? bestMatch : null,
    maxSimilarity: highestScore,
    allSimilarities: allSimilarities.sort((a, b) => b.score - a.score),
    isMatch,
  }
}
