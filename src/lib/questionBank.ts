import { QuestionBank, Question } from '@/types/quiz';

// Import regular question banks

import { englishParts } from '@/../data/english/index';
import { englishMeta } from '@/../data/english/meta';
import { networkParts } from '@/../data/network/index';
import { networkMeta } from '@/../data/network/meta';
import { databaseParts } from '@/../data/database/index';
import { databaseMeta } from '@/../data/database/meta';
import { computerOrganizationParts } from '@/../data/computer-organization/index';
import { computerOrganizationMeta } from '@/../data/computer-organization/meta';

/**
// Network part static import
import networkPart1 from '@/../data/network/network.json';
 */
interface QuestionPart {
  partId: string;
  partName: string;
  questions: Question[];
}

/**
 * Merge multiple parts into a single QuestionBank
 */
function mergeQuestionParts(
  id: string,
  name: string,
  description: string,
  parts: QuestionPart[]
): QuestionBank {
  const allQuestions: Question[] = [];

  for (const part of parts) {
    allQuestions.push(...(part.questions as Question[]));
  }

  // Count total questions including sub-questions
  let totalQuestions = 0;
  allQuestions.forEach(q => {
    if (q.type === 'passage' && 'subQuestions' in q) {
      totalQuestions += q.subQuestions.length;
    } else {
      totalQuestions += 1;
    }
  });

  return {
    id,
    name,
    description: `${description} (${allQuestions.length} mục, ${totalQuestions} câu hỏi)`,
    questions: allQuestions
  };
}



// Build English bank from module
const englishBank = mergeQuestionParts(
  englishMeta.id,
  englishMeta.name,
  englishMeta.description,
  englishParts as QuestionPart[]
);

// Build Network bank from module (convert to QuestionPart nếu cần)
const networkBank = mergeQuestionParts(
  networkMeta.id,
  networkMeta.name,
  networkMeta.description,
  networkParts as unknown as QuestionPart[]
);

export const questionBanks: QuestionBank[] = [
  // English first, then Network (mạng máy tính), followed by others
  englishBank,
  networkBank as QuestionBank,
  mergeQuestionParts(
    databaseMeta.id,
    databaseMeta.name,
    databaseMeta.description,
    databaseParts as QuestionPart[]
  ),
  mergeQuestionParts(
    computerOrganizationMeta.id,
    computerOrganizationMeta.name,
    computerOrganizationMeta.description,
    computerOrganizationParts as QuestionPart[]
  ),
];

export function getQuestionBank(bankId: string): QuestionBank | undefined {
  return questionBanks.find((bank) => bank.id === bankId);
}

export function getRandomQuestions(
  bankId: string,
  count: number
): QuestionBank['questions'] {
  const bank = getQuestionBank(bankId);
  if (!bank) return [];

  const shuffled = [...bank.questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getOrderedQuestions(
  bankId: string,
  count: number
): QuestionBank['questions'] {
  const bank = getQuestionBank(bankId);
  if (!bank) return [];

  // Return questions in original order (no shuffle)
  return bank.questions.slice(0, Math.min(count, bank.questions.length));
}
