import { useState, useEffect, useMemo } from 'react';
import { C } from '../constants';
import { previewEdit, submitEdit, previewDeadlinks, submitDeadlinks } from '../api';
import { EditIcon } from './Shared';

function diffBounds(a, b) {
  const minLen = Math.min(a.length, b.length);
  let prefixLen = 0;
  while (prefixLen < minLen && a[prefixLen] === b[prefixLen]) prefixLen++;
  let suffixLen = 0;
  while (suffixLen < minLen - prefixLen && a[a.length - 1 - suffixLen] === b[b.length - 1 - suffixLen]) suffixLen++;
  return { prefixLen, suffixLen };
}

function renderIntraline(line) {
  const { text, intraline, type } = line;
  if (!intraline) return text;
  const { prefixLen, suffixLen } = intraline;
  const changedStart = prefixLen;
  const changedEnd = text.length - suffixLen;
  const markStyle = {
    background: type === 'del' ? 'rgba(196,83,58,0.45)' : 'rgba(46,125,91,0.45)',
    color: 'inherit',
    borderRadius: 2,
    padding: '0 1px',
  };
  if (text.length <= 200) {
    return (
      <>
        {text.slice(0, changedStart)}
        <mark style={markStyle}>{text.slice(changedStart, changedEnd)}</mark>
        {text.slice(changedEnd)}
      </>
    );
  }
  const R = 90;
  const windowStart = Math.max(0, changedStart - R);
  const windowEnd = Math.min(text.length, changedEnd + R);
  return (
    <>
      {windowStart > 0 && <span style={{ opacity: 0.45 }}>{'…'}</span>}
      {text.slice(windowStart, changedStart)}
      <mark style={markStyle}>{text.slice(changedStart, changedEnd)}</mark>
      {text.slice(changedEnd, windowEnd)}
      {windowEnd < text.length && <span style={{ opacity: 0.45 }}>{'…'}</span>}
    </>
  );
}

function computeDiff(oldText, newText, contextLines = 3) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const hunks = [];

  // Find changed line indices
  const maxLen = Math.max(oldLines.length, newLines.length);
  const changes = [];
  let oi = 0, ni = 0;

  // Simple line-by-line diff: find runs of identical lines and changed regions
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      oi++; ni++;
      continue;
    }
    // Found a difference — scan ahead to find where they sync up again
    const changeStart = { old: oi, new: ni };
    let found = false;
    for (let ahead = 1; ahead < 200 && !found; ahead++) {
      // Try matching old[oi+ahead] with new[ni]
      if (oi + ahead < oldLines.length && ni < newLines.length) {
        let match = true;
        for (let k = 0; k < 3 && match; k++) {
          if (oi + ahead + k >= oldLines.length || ni + k >= newLines.length || oldLines[oi + ahead + k] !== newLines[ni + k]) match = false;
        }
        if (match) { changes.push({ oldStart: changeStart.old, oldEnd: oi + ahead, newStart: changeStart.new, newEnd: ni }); oi += ahead; found = true; continue; }
      }
      // Try matching new[ni+ahead] with old[oi]
      if (ni + ahead < newLines.length && oi < oldLines.length) {
        let match = true;
        for (let k = 0; k < 3 && match; k++) {
          if (ni + ahead + k >= newLines.length || oi + k >= oldLines.length || newLines[ni + ahead + k] !== oldLines[oi + k]) match = false;
        }
        if (match) { changes.push({ oldStart: changeStart.old, oldEnd: oi, newStart: changeStart.new, newEnd: ni + ahead }); ni += ahead; found = true; continue; }
      }
      // Try same-offset sync (equal-size substitution block — both sides advance together)
      if (oi + ahead < oldLines.length && ni + ahead < newLines.length) {
        let match = true;
        for (let k = 0; k < 2 && match; k++) {
          if (oi + ahead + k >= oldLines.length || ni + ahead + k >= newLines.length || oldLines[oi + ahead + k] !== newLines[ni + ahead + k]) match = false;
        }
        if (match) { changes.push({ oldStart: changeStart.old, oldEnd: oi + ahead, newStart: changeStart.new, newEnd: ni + ahead }); oi += ahead; ni += ahead; found = true; continue; }
      }
    }
    if (!found) {
      changes.push({ oldStart: changeStart.old, oldEnd: oldLines.length, newStart: changeStart.new, newEnd: newLines.length });
      break;
    }
  }

  // Build hunks with context
  for (const ch of changes) {
    const ctxStart = Math.max(0, Math.min(ch.oldStart, ch.newStart) - contextLines);
    const ctxEndOld = Math.min(oldLines.length, ch.oldEnd + contextLines);
    const ctxEndNew = Math.min(newLines.length, ch.newEnd + contextLines);
    const lines = [];

    // Context before
    for (let i = ctxStart; i < ch.oldStart; i++) {
      lines.push({ type: 'ctx', text: oldLines[i], lineNo: i + 1 });
    }
    // For equal-size substitution blocks, compute intraline character bounds per paired line
    const blockSize = ch.oldEnd - ch.oldStart;
    const pairedIntraline = (blockSize > 0 && blockSize === ch.newEnd - ch.newStart)
      ? Array.from({ length: blockSize }, (_, i) => diffBounds(oldLines[ch.oldStart + i], newLines[ch.newStart + i]))
      : null;
    // Removed lines
    for (let i = ch.oldStart; i < ch.oldEnd; i++) {
      lines.push({ type: 'del', text: oldLines[i], lineNo: i + 1, intraline: pairedIntraline?.[i - ch.oldStart] ?? null });
    }
    // Added lines
    for (let i = ch.newStart; i < ch.newEnd; i++) {
      lines.push({ type: 'add', text: newLines[i], lineNo: i + 1, intraline: pairedIntraline?.[i - ch.newStart] ?? null });
    }
    // Context after
    for (let i = ch.oldEnd; i < ctxEndOld; i++) {
      lines.push({ type: 'ctx', text: oldLines[i], lineNo: i + 1 });
    }

    if (lines.length > 0) hunks.push(lines);
  }

  return hunks;
}

export default function FixModal({ article, onClose, mode = 'archive' }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!article?.articleId) return;
    setLoading(true);
    const fetchPreview = mode === 'deadlinks' ? previewDeadlinks : previewEdit;
    fetchPreview(article.articleId)
      .then(data => {
        if (data.error) setError(data.error);
        else setPreview(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [article, mode]);

  const diff = useMemo(() => {
    if (!preview?.old_wikitext || !preview?.new_wikitext) return [];
    return computeDiff(preview.old_wikitext, preview.new_wikitext);
  }, [preview]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const doSubmit = mode === 'deadlinks' ? submitDeadlinks : submitEdit;
      const res = await doSubmit(article.articleId);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'Edit failed');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const lineStyle = (type) => ({
    padding: '1px 8px',
    fontFamily: C.mono,
    fontSize: 11,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    background: type === 'del' ? 'rgba(196,83,58,0.12)' : type === 'add' ? 'rgba(46,125,91,0.12)' : 'transparent',
    color: type === 'del' ? C.red : type === 'add' ? C.green : C.textSec,
    borderLeft: type === 'del' ? `3px solid ${C.red}` : type === 'add' ? `3px solid ${C.green}` : '3px solid transparent',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.card, borderRadius: C.radius, padding: '28px 32px', maxWidth: 880, width: '95%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>&times;</button>

        <h2 style={{ fontFamily: C.serif, fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditIcon /> {mode === 'deadlinks' ? 'Tag Dead Links' : 'Fix'}: {article.title}
        </h2>
        <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px' }}>
          {preview ? `${preview.changes} change${preview.changes !== 1 ? 's' : ''} in wikitext` : 'Loading preview...'}
        </p>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
            <div style={{ width: 16, height: 16, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: '_sp .7s linear infinite' }} />
            <span style={{ color: C.textSec, fontSize: 13 }}>Fetching current wikitext and computing diff...</span>
          </div>
        )}

        {error && (
          <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: C.radiusSm, padding: '12px 16px', color: C.red, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ background: C.greenSoft, border: `1px solid ${C.greenBorder}`, borderRadius: C.radiusSm, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.green, fontSize: 14, marginBottom: 4 }}>Edit submitted successfully!</div>
            <div style={{ fontSize: 12, color: C.textSec }}>
              The article has been updated on Wikipedia.
            </div>
          </div>
        )}

        {preview && !result && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Wikitext diff
              </div>
              <div style={{ background: C.bgAlt, borderRadius: C.radiusSm, maxHeight: 450, overflowY: 'auto', border: `1px solid ${C.cardBorder}` }}>
                {diff.length === 0 && (
                  <div style={{ padding: 16, color: C.muted, fontSize: 12 }}>No changes detected.</div>
                )}
                {diff.map((hunk, hi) => (
                  <div key={hi}>
                    {hi > 0 && (
                      <div style={{ padding: '4px 8px', fontSize: 10, color: C.mutedLight, background: C.card, borderTop: `1px solid ${C.cardBorder}`, borderBottom: `1px solid ${C.cardBorder}`, fontFamily: C.mono, textAlign: 'center' }}>
                        &#x22EE; &#x22EE; &#x22EE;
                      </div>
                    )}
                    {hunk.map((line, li) => (
                      <div key={`${hi}-${li}`} style={lineStyle(line.type)}>
                        <span style={{ display: 'inline-block', width: 40, color: C.mutedLight, fontSize: 10, textAlign: 'right', marginRight: 8, userSelect: 'none' }}>
                          {line.lineNo}
                        </span>
                        <span style={{ marginRight: 6, userSelect: 'none' }}>
                          {line.type === 'del' ? '-' : line.type === 'add' ? '+' : ' '}
                        </span>
                        {renderIntraline(line)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={handleSubmit} disabled={submitting}
                onMouseEnter={e => e.currentTarget.style.background = C.accentHover}
                onMouseLeave={e => e.currentTarget.style.background = C.accent}
                style={{ padding: '10px 24px', borderRadius: C.radiusSm, border: 'none', background: C.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer', fontFamily: C.sans, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit edit'}
              </button>
              <button onClick={onClose}
                style={{ padding: '10px 24px', borderRadius: C.radiusSm, border: `1px solid ${C.cardBorder}`, background: C.card, color: C.textSec, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans }}>
                Cancel
              </button>
            </div>
          </>
        )}

        {result && (
          <button onClick={onClose}
            style={{ padding: '10px 24px', borderRadius: C.radiusSm, border: 'none', background: C.btnDark, color: '#FAF9F5', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: C.sans }}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
