import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";

export function useStudy(notebookId: string | undefined) {
  const queryClient = useQueryClient();

  // Quizzes query
  const quizzesQuery = useQuery({
    queryKey: ["quizzes", notebookId],
    queryFn: () => notebookApi.getQuizzes(notebookId!),
    enabled: !!notebookId,
  });

  // Quiz attempts query
  const attemptsQuery = useQuery({
    queryKey: ["quiz-attempts", notebookId],
    queryFn: () => notebookApi.getQuizAttempts(notebookId!),
    enabled: !!notebookId,
  });

  // Flashcards query
  const flashcardsQuery = useQuery({
    queryKey: ["flashcards", notebookId],
    queryFn: () => notebookApi.getFlashcards(notebookId!),
    enabled: !!notebookId,
  });

  // Due flashcards query
  const dueFlashcardsQuery = useQuery({
    queryKey: ["due-flashcards", notebookId],
    queryFn: () => notebookApi.getDueFlashcards(notebookId!),
    enabled: !!notebookId,
  });

  // Quiz generation mutation
  const generateQuizMutation = useMutation({
    mutationFn: () => notebookApi.generateQuiz(notebookId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quizzes", notebookId] });
    },
  });

  // Quiz attempt submit mutation
  const submitAttemptMutation = useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: any[] }) =>
      notebookApi.submitQuizAttempt(quizId, answers),
    onSuccess: (_, { quizId }) => {
      void queryClient.invalidateQueries({ queryKey: ["quiz-attempts", notebookId] });
      void queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quizId] });
    },
  });

  // Flashcard generation mutation
  const generateFlashcardsMutation = useMutation({
    mutationFn: () => notebookApi.generateFlashcards(notebookId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["flashcards", notebookId] });
      void queryClient.invalidateQueries({ queryKey: ["due-flashcards", notebookId] });
    },
  });

  // Flashcard review rating mutation
  const reviewCardMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: number }) =>
      notebookApi.submitFlashcardReview(cardId, rating),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["flashcards", notebookId] });
      void queryClient.invalidateQueries({ queryKey: ["due-flashcards", notebookId] });
    },
  });

  return {
    quizzes: quizzesQuery.data || [],
    isLoadingQuizzes: quizzesQuery.isLoading,
    refetchQuizzes: quizzesQuery.refetch,

    attempts: attemptsQuery.data || [],
    isLoadingAttempts: attemptsQuery.isLoading,

    flashcards: flashcardsQuery.data || [],
    isLoadingFlashcards: flashcardsQuery.isLoading,

    dueFlashcards: dueFlashcardsQuery.data || [],
    isLoadingDueFlashcards: dueFlashcardsQuery.isLoading,

    generateQuiz: generateQuizMutation.mutateAsync,
    isGeneratingQuiz: generateQuizMutation.isPending,

    submitQuizAttempt: submitAttemptMutation.mutateAsync,
    isSubmittingAttempt: submitAttemptMutation.isPending,

    generateFlashcards: generateFlashcardsMutation.mutateAsync,
    isGeneratingFlashcards: generateFlashcardsMutation.isPending,

    reviewCard: reviewCardMutation.mutateAsync,
    isReviewingCard: reviewCardMutation.isPending,
  };
}
