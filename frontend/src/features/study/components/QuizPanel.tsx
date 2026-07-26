"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Award,
  History,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizPanelProps {
  notebookId: string;
  quizzes: any[];
  attempts: any[];
  generateQuiz: () => Promise<any>;
  submitQuizAttempt: (params: { quizId: string; answers: any[] }) => Promise<any>;
  isGenerating: boolean;
  isSubmitting: boolean;
}

export function QuizPanel({
  notebookId,
  quizzes,
  attempts,
  generateQuiz,
  submitQuizAttempt,
  isGenerating,
  isSubmitting,
}: QuizPanelProps) {
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);

  const selectedQuiz = quizzes.find((q) => q._id === selectedQuizId);

  const handleStartQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    setUserAnswers({});
    setQuizResult(null);
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async () => {
    if (!selectedQuizId) return;
    
    const answersList = Object.entries(userAnswers).map(([questionId, userAnswer]) => ({
      questionId,
      userAnswer,
    }));

    try {
      const result = await submitQuizAttempt({
        quizId: selectedQuizId,
        answers: answersList,
      });
      setQuizResult(result);
    } catch (err) {
      alert("Failed to submit quiz attempt");
    }
  };

  const handleGenerate = async () => {
    try {
      const newQuiz = await generateQuiz();
      handleStartQuiz(newQuiz._id);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get attempts for selected quiz
  const quizAttempts = attempts.filter((att) => att.quizId === selectedQuizId);

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Left panel: Quiz Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 border-r border-border/40">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
              <Sparkles className="w-6 h-6 text-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-foreground">Generating Quiz Syllabus</h3>
              <p className="text-xs text-muted-foreground mt-1">Analyzing source chunks and framing conceptual questions...</p>
            </div>
          </div>
        ) : selectedQuiz ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedQuiz.title}</h3>
                  <p className="text-xs text-muted-foreground">Total questions: {selectedQuiz.questions.length}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedQuizId(null)}
                  className="text-xs font-bold rounded-full"
                >
                  Exit Quiz
                </Button>
              </div>

              {quizResult ? (
                /* QUIZ SCORE RESULTS DASHBOARD */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-card/40 border border-border/80 rounded-2xl p-6 flex items-center justify-between shadow-level1">
                    <div className="space-y-1">
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/25 text-emerald-600 font-bold uppercase text-[9px] px-2 py-0.5 rounded-full">
                        Completed
                      </Badge>
                      <h4 className="text-sm font-bold text-foreground mt-1">Quiz Results</h4>
                      <p className="text-xs text-muted-foreground">
                        You answered {quizResult.score} out of {quizResult.totalQuestions} questions correctly.
                      </p>
                    </div>
                    
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-muted/10"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={cn(
                            quizResult.score / quizResult.totalQuestions >= 0.7 
                              ? "text-emerald-500" 
                              : quizResult.score / quizResult.totalQuestions >= 0.4 
                              ? "text-amber-500" 
                              : "text-rose-500"
                          )}
                          strokeDasharray={`${(quizResult.score / quizResult.totalQuestions) * 100}, 100`}
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-foreground">
                        {Math.round((quizResult.score / quizResult.totalQuestions) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {selectedQuiz.questions.map((q: any, idx: number) => {
                      const graded = quizResult.answers.find((ans: any) => ans.questionId === q.id);
                      const userAnswer = graded?.userAnswer || "";
                      const isCorrect = graded?.isCorrect || false;

                      return (
                        <div key={q.id} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-accent">Question {idx + 1}</span>
                              <h4 className="text-xs font-bold text-foreground">{q.questionText}</h4>
                            </div>
                            {isCorrect ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Correct
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/15 text-rose-600 border border-rose-500/25 flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Incorrect
                              </Badge>
                            )}
                          </div>

                          {q.type === "mcq" && (
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((opt: string) => {
                                const isSelected = opt === userAnswer;
                                const isCorrectOpt = opt === q.correctAnswer;
                                return (
                                  <div
                                    key={opt}
                                    className={cn(
                                      "border p-2.5 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-between",
                                      isCorrectOpt 
                                        ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                                        : isSelected 
                                        ? "bg-rose-500/5 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                        : "bg-background/20 border-border/80 text-muted-foreground"
                                    )}
                                  >
                                    <span>{opt}</span>
                                    {isCorrectOpt && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1.5" />}
                                    {!isCorrectOpt && isSelected && <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1.5" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "true_false" && (
                            <div className="flex gap-3">
                              {["true", "false"].map((val) => {
                                const isSelected = val === userAnswer;
                                const isCorrectOpt = val === q.correctAnswer;
                                return (
                                  <div
                                    key={val}
                                    className={cn(
                                      "flex-1 border p-2.5 rounded-xl text-[11px] font-bold text-center uppercase tracking-wider",
                                      isCorrectOpt 
                                        ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600" 
                                        : isSelected 
                                        ? "bg-rose-500/5 border-rose-500/30 text-rose-600"
                                        : "bg-background/20 border-border/80 text-muted-foreground"
                                    )}
                                  >
                                    {val}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "short_answer" && (
                            <div className="space-y-2 text-[11px]">
                              <div className="bg-background/30 border border-border/60 rounded-xl p-3">
                                <span className="font-bold text-muted-foreground uppercase text-[8px] tracking-wider block mb-1">Your Answer</span>
                                <p className="font-medium text-foreground italic">{userAnswer || "(No Answer Provided)"}</p>
                              </div>
                              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                                <span className="font-bold text-emerald-600 uppercase text-[8px] tracking-wider block mb-1">Ideal Model Key Points</span>
                                <p className="font-semibold text-emerald-700 dark:text-emerald-400">{q.correctAnswer}</p>
                              </div>
                            </div>
                          )}

                          <div className="bg-muted/10 border border-border/30 rounded-xl p-3 text-[10.5px] leading-relaxed text-muted-foreground">
                            <span className="font-bold text-foreground block mb-0.5">Explanation</span>
                            {q.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button 
                      onClick={() => handleStartQuiz(selectedQuiz._id)}
                      className="text-xs h-9 px-4 font-bold bg-accent text-white rounded-full hover:bg-accent/90"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                /* IN-PROGRESS ACTIVE QUIZ QUESTIONS SHEET */
                <div className="space-y-6">
                  {selectedQuiz.questions.map((q: any, idx: number) => {
                    const activeVal = userAnswers[q.id] || "";
                    return (
                      <div key={q.id} className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-accent">Question {idx + 1}</span>
                          <h4 className="text-xs font-bold text-foreground leading-relaxed">{q.questionText}</h4>
                        </div>

                        {q.type === "mcq" && (
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            {q.options.map((opt: string) => {
                              const isChosen = opt === activeVal;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => handleSelectOption(q.id, opt)}
                                  className={cn(
                                    "text-left p-3 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer",
                                    isChosen 
                                      ? "bg-accent/5 border-accent text-accent" 
                                      : "bg-background/25 border-border hover:border-foreground/15 hover:bg-background/45"
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {q.type === "true_false" && (
                          <div className="flex gap-3 pt-1">
                            {["true", "false"].map((val) => {
                              const isChosen = val === activeVal;
                              return (
                                <button
                                  key={val}
                                  onClick={() => handleSelectOption(q.id, val)}
                                  className={cn(
                                    "flex-1 p-2.5 rounded-xl text-[11px] font-bold text-center border uppercase tracking-wider cursor-pointer transition-all",
                                    isChosen 
                                      ? "bg-accent/5 border-accent text-accent" 
                                      : "bg-background/25 border-border hover:border-foreground/15"
                                  )}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {q.type === "short_answer" && (
                          <div className="pt-1">
                            <textarea
                              rows={3}
                              value={activeVal}
                              onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                              placeholder="Type your answer here. Provide key terms and short conceptual explanations..."
                              className="w-full text-[11px] p-3 rounded-xl bg-background/30 border border-border focus:border-accent focus:outline-none placeholder-muted-foreground/60 transition-all font-semibold resize-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || Object.keys(userAnswers).length < selectedQuiz.questions.length}
                      className="text-xs h-9 px-5 bg-foreground text-background font-bold rounded-full cursor-pointer hover:bg-foreground/90 transition-all"
                    >
                      {isSubmitting ? "Grading..." : "Submit Answers"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          /* EMPTY STATE / LANDING PANEL */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="max-w-xs space-y-1.5">
              <h3 className="text-sm font-bold text-foreground">Interactive Quizzes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate custom MCQ, True/False, and short-answer exams compiled from your uploaded sources.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="text-xs h-9 px-5 bg-foreground text-background font-bold rounded-full hover:bg-foreground/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-level1"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Generate Quiz
            </Button>
          </div>
        )}
      </div>

      {/* Right panel: History Sidebar */}
      <div className="w-64 flex flex-col bg-sidebar overflow-hidden">
        <div className="p-4 border-b border-border/40 flex items-center gap-2 flex-shrink-0">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <h4 className="text-xs font-bold text-foreground">Quiz History</h4>
        </div>

        <ScrollArea className="flex-1 p-3">
          {quizzes.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-center p-4">
              <p className="text-[10px] text-muted-foreground font-semibold">No quizzes generated yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quizzes.map((quiz) => {
                const quizAtts = attempts.filter((att) => att.quizId === quiz._id);
                const bestScore = quizAtts.length > 0 
                  ? Math.max(...quizAtts.map((att) => att.score)) 
                  : null;
                const isCurrent = quiz._id === selectedQuizId;

                return (
                  <div
                    key={quiz._id}
                    onClick={() => handleStartQuiz(quiz._id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 group relative overflow-hidden",
                      isCurrent 
                        ? "bg-background/80 border-accent shadow-xs" 
                        : "bg-card border-border/60 hover:border-foreground/15 hover:shadow-xs"
                    )}
                  >
                    <div className="space-y-0.5">
                      <h5 className="text-[10.5px] font-bold text-foreground leading-snug truncate group-hover:text-accent transition-colors">
                        {quiz.title}
                      </h5>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        {bestScore !== null ? `Best: ${bestScore}/${quiz.questions.length}` : "Not Attempted"}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
