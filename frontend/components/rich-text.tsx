import { Fragment, type ReactNode } from "react";

/** Renders model answers safely: paragraphs, lists, **bold**, and [n] citation chips. No HTML. */
export function RichText({ text, onCite }: Readonly<{ text: string; onCite?: (index: number) => void }>) {
  const blocks: ReactNode[] = []; let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => { if (!list) return; const Tag = list.ordered ? "ol" : "ul"; blocks.push(<Tag key={blocks.length} className={`my-2 space-y-1 ps-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>{list.items.map((item, index) => <li key={index}>{inline(item, onCite)}</li>)}</Tag>); list = null; };
  for (const raw of text.split("\n")) {
    const line = raw.trim(); const bullet = /^[-*•]\s+(.*)$/.exec(line); const numbered = /^(?:\d+|[۰-۹]+)[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) { const ordered = Boolean(numbered); if (list && list.ordered !== ordered) flush(); list ??= { ordered, items: [] }; list.items.push((bullet ?? numbered)![1]); continue; }
    flush();
    if (line) blocks.push(<p key={blocks.length} className="my-1.5">{inline(line.replace(/^#+\s*/, ""), onCite)}</p>);
  }
  flush();
  return <div dir="auto" className="text-sm leading-7">{blocks}</div>;
}

function inline(text: string, onCite?: (index: number) => void): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const cite = /^\[(\d+)\]$/.exec(part);
    if (cite) return <button key={index} type="button" onClick={() => onCite?.(Number(cite[1]))} className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-teal-50 px-1 align-text-top text-[11px] font-bold text-teal-700">{cite[1]}</button>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}
