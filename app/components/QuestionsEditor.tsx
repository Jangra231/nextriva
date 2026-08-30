import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

export type QuestionDraft = { question: string; fieldType: "short_text" | "long_text" | "select" | "checkbox"; required: boolean };

function queryHref(questionDrafts: number, questionOrder: number[], removeQuestion?: number) {
  const query = new URLSearchParams({ step: "6", questionDrafts: String(questionDrafts) });
  if (questionOrder.length) query.set("questionOrder", questionOrder.join(","));
  if (typeof removeQuestion === "number") query.set("removeQuestion", String(removeQuestion));
  return `?${query.toString()}`;
}

export default function QuestionsEditor({ questions, questionDrafts }: { questions: QuestionDraft[]; questionDrafts: number }) {
  const order = questions.map((_, index) => index);
  const moveHref = (index: number, direction: -1 | 1) => {
    const next = [...order]; const target = index + direction;
    if (target < 0 || target >= next.length) return undefined;
    [next[index], next[target]] = [next[target], next[index]];
    return queryHref(questionDrafts, next);
  };
  return <div className="question-editor"><SystemQuestion label="Name" type="Text" /><SystemQuestion label="Email" type="Email" /><p className="drag-help">Add, remove, or reorder questions with the links below. Changes are only saved when you choose Save Questions.</p><input type="hidden" name="customQuestionCount" value={questions.length} />{questions.map((item, index) => <div className="custom-question" key={`${index}-${item.question}`}><div className="question-card-head"><b>Custom question {index + 1}</b><div className="question-actions">{moveHref(index, -1) ? <a className="icon-button" aria-label={`Move custom question ${index + 1} up`} href={moveHref(index, -1)}><ChevronUp size={15} /></a> : null}{moveHref(index, 1) ? <a className="icon-button" aria-label={`Move custom question ${index + 1} down`} href={moveHref(index, 1)}><ChevronDown size={15} /></a> : null}<a className="icon-button" aria-label={`Remove custom question ${index + 1}`} href={queryHref(questionDrafts, order, index)}><Trash2 size={15} /></a></div></div><label className="form-label">Question<input className="input" name={`customQuestion_${index}_question`} defaultValue={item.question} placeholder="What is your T-shirt size?" /></label><div className="two-col" style={{ marginTop: 12 }}><label className="form-label">Response type<select className="select" name={`customQuestion_${index}_fieldType`} defaultValue={item.fieldType}><option value="short_text">Short text</option><option value="long_text">Long text</option><option value="select">Select</option><option value="checkbox">Checkbox</option></select></label><label className="check-label"><input type="checkbox" name={`customQuestion_${index}_required`} value="yes" defaultChecked={item.required} /> Required</label></div></div>)}<a className="btn btn-outline add-question" href={queryHref(questionDrafts + 1, order)}><Plus size={15} /> Add New Question</a></div>;
}

function SystemQuestion({ label, type }: { label: string; type: string }) { return <div className="system-question"><div><b>{label}</b><small>{type} · For all tickets</small></div><div className="system-actions"><span>{label}</span><small>Required</small></div></div>; }
