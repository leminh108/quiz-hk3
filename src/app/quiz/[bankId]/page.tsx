'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getQuestionBank, getRandomQuestions, getOrderedQuestions } from '@/lib/questionBank';
import {
  Question,
  WrongQuestion,
  isPassageQuestion,
  PassageQuestion,
  SingleQuestion,
} from '@/types/quiz';
import { wrongQuestionsStorage, quizSessionStorage } from '@/lib/storage';
import { playSuccessSound, playFailureSound } from '@/lib/soundEffects';

// Interface for tracking answers including sub-questions
interface ExtendedQuizAnswer {
  questionId: number;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  subAnswers?: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
}

export default function QuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bankId = params.bankId as string;
  const count = parseInt(searchParams.get('count') || '10');
  const shouldContinue = searchParams.get('continue') === 'true';
  const isStudyMode = searchParams.get('mode') === 'study';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExtendedQuizAnswer[]>([]);
  const [bankName, setBankName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(Date.now());
  // For passage questions: track which sub-question is active
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  // For study mode: track revealed answers
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());

    // Hàm tráo đổi thứ tự câu hỏi
    const handleShuffleQuestions = () => {
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQuestions(shuffled);
      setCurrentIndex(0);
      setAnswers(
        shuffled.map((q) => ({
          questionId: q.id,
          selectedAnswer: null,
          subAnswers: isPassageQuestion(q)
            ? q.subQuestions.reduce((acc, sq) => ({ ...acc, [sq.id]: null }), {})
            : undefined,
        }))
      );
      setActiveSubIndex(0);
      setRevealedAnswers(new Set());
    };

  // Save session to localStorage
  const saveSession = useCallback(() => {
    if (bankId === 'wrong' || questions.length === 0) return;

    quizSessionStorage.save({
      bankId,
      bankName,
      questions,
      answers,
      currentIndex,
      startTime,
      lastUpdated: Date.now(),
    });
  }, [bankId, bankName, questions, answers, currentIndex, startTime]);

  // Auto-save when answers or currentIndex change
  useEffect(() => {
    if (!isLoading && questions.length > 0 && bankId !== 'wrong') {
      saveSession();
    }
  }, [answers, currentIndex, isLoading, saveSession, questions.length, bankId]);

  useEffect(() => {
    if (bankId === 'wrong') {
      // Load wrong questions
      const wrongQuestions = wrongQuestionsStorage.getAll();
      if (wrongQuestions.length === 0) {
        router.push('/');
        return;
      }
      setQuestions(wrongQuestions.map((wq) => wq.question));
      setBankName('Các câu sai cần ôn tập');
      setAnswers(
        wrongQuestions.map((wq) => ({
          questionId: wq.question.id,
          selectedAnswer: null,
          subAnswers: isPassageQuestion(wq.question)
            ? wq.question.subQuestions.reduce((acc, sq) => ({ ...acc, [sq.id]: null }), {})
            : undefined,
        }))
      );
      setIsLoading(false);
    } else {
      // Check if we should continue a saved session
      const savedSession = quizSessionStorage.getSession(bankId);

      if (shouldContinue && savedSession) {
        // Restore saved session
        setQuestions(savedSession.questions);
        setBankName(savedSession.bankName);
        setAnswers(savedSession.answers);
        setCurrentIndex(savedSession.currentIndex);
        setStartTime(savedSession.startTime);
        setIsLoading(false);
      } else {
        // Start new quiz
        const bank = getQuestionBank(bankId);
        if (!bank) {
          router.push('/');
          return;
        }
        // Use ordered questions for study mode, random for quiz mode
        const selectedQuestions = isStudyMode
          ? getOrderedQuestions(bankId, count)
          : getRandomQuestions(bankId, count);
        setQuestions(selectedQuestions);
        setBankName(bank.name);
        setAnswers(
          selectedQuestions.map((q) => ({
            questionId: q.id,
            selectedAnswer: null,
            subAnswers: isPassageQuestion(q)
              ? q.subQuestions.reduce((acc, sq) => ({ ...acc, [sq.id]: null }), {})
              : undefined,
          }))
        );
        setStartTime(Date.now());
        // Remove old session if starting fresh
        if (savedSession && !shouldContinue) {
          quizSessionStorage.removeSession(bankId);
        }
        setIsLoading(false);
      }
    }
  }, [bankId, count, router, shouldContinue, isStudyMode]);

  // Reset active sub-question when changing main question
  // Also clear revealed state for the new question in study mode
  useEffect(() => {
    setActiveSubIndex(0);

    // In study mode, clear revealed answers for the current question
    // so user has to click again to see the answer
    if (isStudyMode && questions[currentIndex]) {
      const q = questions[currentIndex];
      setRevealedAnswers(prev => {
        const newSet = new Set(prev);
        if (isPassageQuestion(q)) {
          // Clear all sub-question reveals for this passage
          q.subQuestions.forEach(sq => {
            newSet.delete(`sub-${q.id}-${sq.id}`);
          });
        } else {
          newSet.delete(`single-${q.id}`);
        }
        return newSet;
      });

      // Also reset the answer for this question
      setAnswers(prev => {
        const newAnswers = [...prev];
        if (newAnswers[currentIndex]) {
          newAnswers[currentIndex] = {
            ...newAnswers[currentIndex],
            selectedAnswer: null,
            subAnswers: isPassageQuestion(q)
              ? q.subQuestions.reduce((acc, sq) => ({ ...acc, [sq.id]: null }), {})
              : undefined,
          };
        }
        return newAnswers;
      });
    }
  }, [currentIndex, isStudyMode]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer: 'A' | 'B' | 'C' | 'D') => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      ...newAnswers[currentIndex],
      questionId: currentQuestion.id,
      selectedAnswer: answer,
    };
    setAnswers(newAnswers);
  };

  const handleSubAnswerSelect = (subQuestionId: number, answer: 'A' | 'B' | 'C' | 'D') => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      ...newAnswers[currentIndex],
      subAnswers: {
        ...newAnswers[currentIndex].subAnswers,
        [subQuestionId]: answer,
      },
    };
    setAnswers(newAnswers);
  };

  // For study mode: reveal answer for current question
  const handleRevealAnswer = (questionKey: string) => {
    setRevealedAnswers(prev => new Set(prev).add(questionKey));
  };

  // Check if answer is revealed for a specific question
  const isAnswerRevealed = (questionKey: string) => {
    return revealedAnswers.has(questionKey);
  };

  // Handle Enter key to go to next question in study mode
  useEffect(() => {
    if (!isStudyMode || isLoading || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent any default Enter behavior

        if (isPassageQuestion(currentQuestion)) {
          // For passage questions: check if current sub-question has revealed answer
          const currentSubQuestion = currentQuestion.subQuestions[activeSubIndex];
          const subQuestionKey = `sub-${currentQuestion.id}-${currentSubQuestion.id}`;

          if (isAnswerRevealed(subQuestionKey)) {
            // Move to next sub-question or next main question
            if (activeSubIndex < currentQuestion.subQuestions.length - 1) {
              setActiveSubIndex(activeSubIndex + 1);
            } else if (currentIndex < questions.length - 1) {
              setCurrentIndex(currentIndex + 1);
              // Reset active sub index is already handled by another useEffect
            }
          }
        } else {
          // For single questions: check if answer is revealed
          const questionKey = `single-${currentQuestion.id}`;

          if (isAnswerRevealed(questionKey) && currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudyMode, isLoading, currentQuestion, currentIndex, activeSubIndex, questions.length, revealedAnswers]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate results
    let correctCount = 0;
    let totalSubQuestions = 0;
    const wrongQuestions: WrongQuestion[] = [];

    questions.forEach((question, idx) => {
      if (isPassageQuestion(question)) {
        // Handle passage questions
        question.subQuestions.forEach((subQ) => {
          totalSubQuestions++;
          const userAnswer = answers[idx]?.subAnswers?.[subQ.id];
          if (userAnswer === subQ.correctAnswer) {
            correctCount++;
          } else if (userAnswer) {
            // For wrong sub-questions, we store the parent passage question
            // but mark which sub-question was wrong
            wrongQuestions.push({
              bankId: bankId === 'wrong' ? 'mixed' : bankId,
              bankName,
              question: question,
              selectedAnswer: userAnswer,
              timestamp: Date.now(),
              // We'll need to extend WrongQuestion type for this
            });
          }
        });
      } else {
        // Handle single questions
        totalSubQuestions++;
        const userAnswer = answers[idx]?.selectedAnswer;
        if (userAnswer === question.correctAnswer) {
          correctCount++;
          // Remove from wrong questions if answered correctly
          if (bankId === 'wrong') {
            const wrongQ = wrongQuestionsStorage.getAll().find(
              (wq) => wq.question.id === question.id
            );
            if (wrongQ) {
              wrongQuestionsStorage.removeWrongQuestion(wrongQ.bankId, question.id);
            }
          }
        } else if (userAnswer) {
          wrongQuestions.push({
            bankId: bankId === 'wrong' ? 'mixed' : bankId,
            bankName,
            question,
            selectedAnswer: userAnswer,
            timestamp: Date.now(),
          });
        }
      }
    });

    // Save wrong questions (only if not in wrong questions mode)
    if (bankId !== 'wrong') {
      wrongQuestionsStorage.addWrongQuestions(wrongQuestions);
    }

    // Clear saved session since quiz is completed
    if (bankId !== 'wrong') {
      quizSessionStorage.removeSession(bankId);
    }

    // Navigate to results page with state
    const resultData = {
      totalQuestions: totalSubQuestions,
      correctAnswers: correctCount,
      wrongQuestions,
      percentage: Math.round((correctCount / totalSubQuestions) * 100),
      bankName,
      questions,
      answers,
    };

    sessionStorage.setItem('quizResult', JSON.stringify(resultData));
    router.push('/result');
  };

  // Abandon quiz and go back to home
  const handleAbandonQuiz = () => {
    if (confirm('Bạn có chắc muốn bỏ bài thi? Tiến độ đã lưu, bạn có thể tiếp tục sau.')) {
      router.push('/');
    }
  };

  // Reset quiz and start fresh
  const handleResetQuiz = () => {
    if (confirm('Bạn có chắc muốn làm lại từ đầu? Tiến độ hiện tại sẽ bị xóa.')) {
      quizSessionStorage.removeSession(bankId);
      // Reload the page to start fresh
      window.location.href = `/quiz/${bankId}?count=${questions.length}`;
    }
  };

  if (isLoading || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Đang tải...</p>
      </div>
    );
  }

  // Calculate answered count (including sub-questions)
  const getAnsweredCount = () => {
    let count = 0;
    answers.forEach((a, idx) => {
      const q = questions[idx];
      if (isPassageQuestion(q)) {
        const subAnswers = a.subAnswers || {};
        count += Object.values(subAnswers).filter(v => v !== null).length;
      } else {
        if (a.selectedAnswer !== null) count++;
      }
    });
    return count;
  };

  const getTotalSubQuestions = () => {
    return questions.reduce((acc, q) => {
      if (isPassageQuestion(q)) {
        return acc + q.subQuestions.length;
      }
      return acc + 1;
    }, 0);
  };

  const answeredCount = getAnsweredCount();
  const totalCount = getTotalSubQuestions();

  // Render different UI based on question type
  const renderQuestionContent = () => {
    if (isPassageQuestion(currentQuestion)) {
      return renderPassageQuestion(currentQuestion);
    }
    return renderSingleQuestion(currentQuestion as SingleQuestion);
  };

  const renderSingleQuestion = (question: SingleQuestion) => {
    const questionKey = `single-${question.id}`;
    const revealed = isAnswerRevealed(questionKey);

    return (
      <>
        <h2 className="text-lg md:text-xl font-semibold mb-6 leading-relaxed">
          {question.question}
        </h2>

        <div className="space-y-3">
          {(Object.keys(question.options) as Array<'A' | 'B' | 'C' | 'D'>).map(
            (key) => {
              const isCorrect = key === question.correctAnswer;
              const isSelected = currentAnswer?.selectedAnswer === key;

              // Determine button style
              let buttonStyle = 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800';

              if (isStudyMode && revealed) {
                if (isCorrect) {
                  buttonStyle = 'border-green-500 bg-green-50 dark:bg-green-900/30';
                } else if (isSelected && !isCorrect) {
                  buttonStyle = 'border-red-500 bg-red-50 dark:bg-red-900/30';
                }
              } else if (isSelected) {
                buttonStyle = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
              }

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isStudyMode) {
                      handleAnswerSelect(key);
                      handleRevealAnswer(questionKey);
                      // Play sound based on correctness
                      if (key === question.correctAnswer) {
                        playSuccessSound();
                      } else {
                        playFailureSound();
                      }
                    } else {
                      handleAnswerSelect(key);
                      // handleSubmit();
                    }
                  }}
                  onDoubleClick={()=>{
                    handleNext()
                  }}
                  className={`w-full p-4 md:p-6 text-left rounded-lg border-2 transition-all ${buttonStyle}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm ${isStudyMode && revealed && isCorrect
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                      {key}
                    </span>
                    <span className="flex-1 text-base">
                      {question.options[key]}
                    </span>
                    {isStudyMode && revealed && isCorrect && (
                      <span className="text-green-600 font-semibold">✓ Đúng</span>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* Show explanation in study mode when answer is revealed */}
        {isStudyMode && revealed && question.explanation && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-2">💡 Giải thích:</p>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{question.explanation}</p>
          </div>
        )}

        {/* Study mode hints */}
        {isStudyMode && !revealed && (
          <p className="mt-4 text-center text-sm text-gray-500">
            👆 Click vào đáp án để xem kết quả và giải thích
          </p>
        )}
        {isStudyMode && revealed && currentIndex < questions.length - 1 && (
          <p className="mt-4 text-center text-sm text-green-600 dark:text-green-400 font-medium">
            ⏎ Nhấn Enter để qua câu tiếp theo
          </p>
        )}
      </>
    );
  };

  const renderPassageQuestion = (question: PassageQuestion) => {
    const currentSubQuestion = question.subQuestions[0];
    const subAnswer = currentAnswer?.subAnswers?.[currentSubQuestion?.id];

    // Highlight blanks in the passage
    const renderPassageWithHighlights = () => {
      let passageText = question.passage;

      // Replace blank markers with styled spans
      question.subQuestions.forEach((sq, idx) => {
        const blankPattern = new RegExp(`____${sq.id}____`, 'g');
        const isActive = idx === activeSubIndex;
        const hasAnswer = currentAnswer?.subAnswers?.[sq.id];

        passageText = passageText.replace(
          blankPattern,
          `<span class="inline-block min-w-20 px-2 py-1 mx-1 rounded font-semibold ${isActive
            ? 'bg-blue-500 text-white'
            : hasAnswer
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-200 dark:bg-gray-700'
          }">(${sq.id})</span>`
        );
      });

      return passageText;
    };

    return (
      <div className="space-y-6">
        {/* Passage Title */}
        {question.passageTitle && (
          <div className="text-center border-b pb-4 mb-4">
            <h2 className="text-xl font-bold">{question.passageTitle}</h2>
            <span className="text-sm text-muted-foreground">
              {question.passageType === 'fill-in-the-blank'
                ? 'Điền từ vào chỗ trống'
                : 'Đọc hiểu'}
            </span>
          </div>
        )}

        {/* Passage Text */}
        <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
          <div
            className="prose dark:prose-invert max-w-none leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: renderPassageWithHighlights() }}
          />
        </div>

        {/* Sub-questions navigation */}
        <div className="flex flex-wrap gap-2 justify-center">
          {question.subQuestions.map((sq, idx) => {
            const hasAnswer = currentAnswer?.subAnswers?.[sq.id];
            return (
              <button
                key={sq.id}
                onClick={() => setActiveSubIndex(idx)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${idx === activeSubIndex
                  ? 'bg-blue-500 text-white'
                  : hasAnswer
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
              >
                Câu {sq.id}
              </button>
            );
          })}
        </div>

        {/* Current Sub-question */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">
            Câu {currentSubQuestion?.id}: {currentSubQuestion?.question}
          </h3>

          {(() => {
            const subQuestionKey = `sub-${question.id}-${currentSubQuestion.id}`;
            const subRevealed = isAnswerRevealed(subQuestionKey);

            return (
              <>
                <div className="space-y-3">
                  {(Object.keys(currentSubQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map(
                    (key) => {
                      const isCorrect = key === currentSubQuestion.correctAnswer;
                      const isSelected = subAnswer === key;

                      // Determine button style
                      let buttonStyle = 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800';

                      if (isStudyMode && subRevealed) {
                        if (isCorrect) {
                          buttonStyle = 'border-green-500 bg-green-50 dark:bg-green-900/30';
                        } else if (isSelected && !isCorrect) {
                          buttonStyle = 'border-red-500 bg-red-50 dark:bg-red-900/30';
                        }
                      } else if (isSelected) {
                        buttonStyle = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
                      }

                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (isStudyMode) {
                              handleSubAnswerSelect(currentSubQuestion.id, key);
                              handleRevealAnswer(subQuestionKey);
                              // Play sound based on correctness
                              if (key === currentSubQuestion.correctAnswer) {
                                playSuccessSound();
                              } else {
                                playFailureSound();
                              }
                            } else {
                              handleSubAnswerSelect(currentSubQuestion.id, key);
                              handleSubmit();
                            }
                          }}
                          className={`w-full p-4 text-left rounded-lg border-2 transition-all ${buttonStyle}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm ${isStudyMode && subRevealed && isCorrect
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                              {key}
                            </span>
                            <span className="flex-1 text-base">
                              {currentSubQuestion.options[key]}
                            </span>
                            {isStudyMode && subRevealed && isCorrect && (
                              <span className="text-green-600 font-semibold">✓ Đúng</span>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Show explanation in study mode when answer is revealed */}
                {isStudyMode && subRevealed && currentSubQuestion.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-2">💡 Giải thích:</p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{currentSubQuestion.explanation}</p>
                  </div>
                )}

                {/* Study mode hints */}
                {isStudyMode && !subRevealed && (
                  <p className="mt-4 text-center text-sm text-gray-500">
                    👆 Click vào đáp án để xem kết quả và giải thích
                  </p>
                )}
                {isStudyMode && subRevealed && (activeSubIndex < question.subQuestions.length - 1 || currentIndex < questions.length - 1) && (
                  <p className="mt-4 text-center text-sm text-green-600 dark:text-green-400 font-medium">
                    ⏎ Nhấn Enter để qua {activeSubIndex < question.subQuestions.length - 1 ? 'câu con tiếp theo' : 'đoạn văn tiếp theo'}
                  </p>
                )}
              </>
            );
          })()}

          {/* Sub-question navigation */}
          <div className="flex justify-between mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSubIndex(Math.max(0, activeSubIndex - 1))}
              disabled={activeSubIndex === 0}
            >
              ← Câu con trước
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSubIndex(Math.min(question.subQuestions.length - 1, activeSubIndex + 1))}
              disabled={activeSubIndex === question.subQuestions.length - 1}
            >
              Câu con tiếp →
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className='flex items-center gap-4'>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {bankName}
              </h1>
              {isStudyMode && (
                <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm font-medium">
                  📚 Chế độ học tập
                </span>
                )}
                {isStudyMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShuffleQuestions}
                    className="ml-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    🔄 Đổi thứ tự câu hỏi
                  </Button>
              )}
            </div>
            <div>

              {isStudyMode && (
                <div className=''>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/')}
                    className="text-gray-500 hover:text-gray-700  border-2 border-green-600 rounded-lg p-2
                    "
                  >
                    ← Quay về trang chủ
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span>
              Đề {currentIndex + 1}/{questions.length}
            </span>
            <span>•</span>
            <span>
              Đã trả lời: {answeredCount}/{totalCount}
            </span>
            {isPassageQuestion(currentQuestion) && (
              <>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400">
                  📖 {currentQuestion.passageType === 'fill-in-the-blank' ? 'Điền từ' : 'Đọc hiểu'}
                </span>
              </>
            )}
          </div>
          <Progress value={progress} className="mt-4" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardContent className="p-6 md:p-8">
            {renderQuestionContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            variant="outline"
            size="lg"
          >
            ← Câu trước
          </Button>

          <div className="flex gap-2">
            {isStudyMode ? (
              // Study mode: only navigation, no submit
              currentIndex === questions.length - 1 ? (
                <Button
                  onClick={() => router.push('/')}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✓ Hoàn thành học tập
                </Button>
              ) : (
                <Button onClick={handleNext} size="lg">
                  Câu tiếp →
                </Button>
              )
            ) : (
              // Quiz mode: submit at the end
              currentIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={answeredCount === 0}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Nộp bài ({answeredCount}/{totalCount})
                </Button>
              ) : (
                <Button onClick={handleNext} size="lg">
                  Câu tiếp →
                </Button>
              )
            )}
          </div>
        </div>

        {/* Quiz Actions */}
        {bankId !== 'wrong' && !isStudyMode && (
          <div className="mt-4 flex justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAbandonQuiz}
              className="text-gray-500 hover:text-gray-700"
            >
              ⏸️ Tạm dừng (lưu tiến độ)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetQuiz}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              🔄 Làm lại từ đầu
            </Button>
          </div>
        )}

        {/* Study mode: Back to home */}
        {isStudyMode && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Quay về trang chủ
            </Button>
          </div>
        )}

        {/* Quick Navigation */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium mb-3">Chuyển nhanh đến câu:</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              let isAnswered = false;
              if (isPassageQuestion(q)) {
                const subAnswers = answers[idx]?.subAnswers || {};
                const answeredSubs = Object.values(subAnswers).filter(v => v !== null).length;
                isAnswered = answeredSubs === q.subQuestions.length;
              } else {
                isAnswered = answers[idx]?.selectedAnswer !== null;
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${idx === currentIndex
                    ? 'bg-blue-500 text-white'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  title={isPassageQuestion(q) ? `📖 ${q.passageTitle || 'Đoạn văn'}` : undefined}
                >
                  {idx + 1}
                  {isPassageQuestion(q) && <span className="text-xs">📖</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
