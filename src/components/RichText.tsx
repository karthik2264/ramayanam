export function RichText({ value }: { value: string }) {
  const nodes: Array<string | { em: string }> = [];
  const pattern = /<em>(.*?)<\/em>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > last) nodes.push(value.slice(last, match.index));
    nodes.push({ em: match[1] });
    last = match.index + match[0].length;
  }
  if (last < value.length) nodes.push(value.slice(last));

  return (
    <>
      {nodes.map((node, index) =>
        typeof node === "string" ? <span key={index}>{node}</span> : <em key={index}>{node.em}</em>,
      )}
    </>
  );
}

export function anchorId(verseId: string) {
  return `v-${verseId.replace(/[^a-z0-9]+/gi, "-")}`;
}
