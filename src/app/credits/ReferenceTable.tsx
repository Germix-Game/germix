import { REFERENCES, type Reference } from "./references";

// Citation text already contains the URL inline (e.g. "... Available from:
// https://...") — split around it so that exact substring becomes the link
// instead of appending a second, duplicate copy of the URL.
function CitationText({ reference }: { reference: Reference }) {
  if (!reference.url) return <>{reference.text}</>;

  const idx = reference.text.indexOf(reference.url);
  if (idx === -1) {
    return (
      <>
        {reference.text}{" "}
        <a
          href={reference.url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-[#1a56db] underline hover:text-[#153fa8]"
        >
          {reference.url}
        </a>
      </>
    );
  }

  const before = reference.text.slice(0, idx);
  const after = reference.text.slice(idx + reference.url.length);
  return (
    <>
      {before}
      <a
        href={reference.url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-[#1a56db] underline hover:text-[#153fa8]"
      >
        {reference.url}
      </a>
      {after}
    </>
  );
}

// Replaces the old 6_reference_table.webp overlay with a real, accessible
// table so every citation link is actually clickable.
export function ReferenceTable() {
  return (
    <div
      className="w-full overflow-x-auto rounded-lg border"
      style={{ maxWidth: "58rem", borderColor: "#5a2413" }}
    >
      <table className="w-full min-w-[22rem] table-fixed border-collapse text-left text-[0.35rem] leading-snug sm:text-[13px]">
        <colgroup>
          <col className="w-8 sm:w-14" />
          <col />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: "#e8c98f" }}>
            <th
              className="border-b px-1.5 py-1 font-semibold text-black sm:px-2 sm:py-1.5"
              style={{ borderColor: "#5a2413" }}
            >
              Ref
            </th>
            <th
              className="border-b px-1.5 py-1 font-semibold text-black sm:px-2 sm:py-1.5"
              style={{ borderColor: "#5a2413" }}
            >
              Citation
            </th>
          </tr>
        </thead>
        <tbody>
          {REFERENCES.map((reference) => (
            <tr key={reference.id} className="odd:bg-white even:bg-[#f2ede2]">
              <td
                className="break-words border-b px-1.5 py-1 align-top text-black sm:px-2 sm:py-1.5"
                style={{ borderColor: "#d8c8a8" }}
              >
                [{reference.id}]
              </td>
              <td
                className="break-words border-b px-1.5 py-1 align-top leading-snug text-black sm:px-2 sm:py-1.5 [@media(min-width:768px)_and_(max-width:1400px)]:text-[11px]"
                style={{ borderColor: "#d8c8a8" }}
              >
                <CitationText reference={reference} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
