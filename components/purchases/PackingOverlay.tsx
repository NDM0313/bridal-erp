'use client';

import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { X, Zap, Box as BoxIcon, Plus, Trash2, Link2, Layers, Ruler, Lightbulb, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface PackingEntryData {
  boxes: number;
  piecesPerBox: number;
  metersPerPiece: number;
  detailedBoxes: Array<{ id: string; pieces: number; metersPerPiece: number; individualMeters?: number[] }>;
  entryMode?: 'quick' | 'detailed'; // Track which mode was used to enter data
  totalPieces?: number; // Total pieces across all boxes (for display)
  totalMeters?: number; // Total meters across all boxes (for display)
}

interface PackingEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PackingEntryData) => void;
  productName: string;
  initialData?: PackingEntryData | null;
}

type Piece = { id: string; meters: string };
type BoxState = { id: string; pieces: Piece[] };
type LoosePiece = { id: string; meters: string };

export function PackingEntry({ isOpen, onClose, onSave, productName, initialData }: PackingEntryProps) {
  const [mode, setMode] = useState<'quick' | 'detailed'>('detailed');
  const [lockedMode, setLockedMode] = useState<'quick' | 'detailed' | null>(null);

  // Quick mode state
  const [boxes, setBoxes] = useState('');
  const [piecesPerBox, setPiecesPerBox] = useState('');
  const [metersPerPiece, setMetersPerPiece] = useState('');

  // Detailed mode state
  const [boxList, setBoxList] = useState<BoxState[]>([{ id: crypto.randomUUID(), pieces: [] }]);
  const [loosePieces, setLoosePieces] = useState<LoosePiece[]>([]);
  const [addingPieceFor, setAddingPieceFor] = useState<string | null>(null);
  const [addingLoose, setAddingLoose] = useState<boolean>(false);
  const [draftMeters, setDraftMeters] = useState<string>('');

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastAddedInputRef = useRef<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (isOpen && initialData) {
      // Detect which mode was used to save the data
      const savedInQuickMode = initialData.entryMode === 'quick' || (!initialData.detailedBoxes || initialData.detailedBoxes.length === 0);
      const savedInDetailedMode = initialData.entryMode === 'detailed' || (initialData.detailedBoxes && initialData.detailedBoxes.length > 0);

      if (savedInQuickMode) {
        // Data was saved in quick mode - load it and lock quick mode
        setBoxes(String(initialData.boxes || ''));
        setPiecesPerBox(String(initialData.totalPieces || initialData.piecesPerBox || ''));
        setMetersPerPiece(String(initialData.totalMeters || initialData.metersPerPiece || ''));
        setBoxList([{ id: crypto.randomUUID(), pieces: [] }]);
        setLoosePieces([]);
        setMode('quick');
        setLockedMode('quick');
      } else if (savedInDetailedMode && initialData.detailedBoxes && initialData.detailedBoxes.length > 0) {
        // Data was saved in detailed mode - load it and lock detailed mode
        const mapped = initialData.detailedBoxes.map((b) => ({
          id: crypto.randomUUID(),
          pieces: b.individualMeters && b.individualMeters.length > 0
            ? b.individualMeters.map((meters) => ({
                id: crypto.randomUUID(),
                meters: meters.toString(),
              }))
            : Array.from({ length: b.pieces }, () => ({
                id: crypto.randomUUID(),
                meters: b.metersPerPiece ? b.metersPerPiece.toString() : '',
              })),
        }));
        setBoxList(mapped.length ? mapped : [{ id: crypto.randomUUID(), pieces: [] }]);
        setLoosePieces([]);
        setMode('detailed');
        setLockedMode('detailed');
      } else {
        setBoxList([{ id: crypto.randomUUID(), pieces: [] }]);
        setLoosePieces([]);
        setMode('detailed');
        setLockedMode(null);
      }
    } else if (isOpen) {
      setBoxes('');
      setPiecesPerBox('');
      setMetersPerPiece('');
      setBoxList([{ id: crypto.randomUUID(), pieces: [] }]);
      setLoosePieces([]);
      setAddingPieceFor(null);
      setAddingLoose(false);
      setDraftMeters('');
      setMode('detailed');
      setLockedMode(null);
    }
  }, [isOpen, initialData]);

  // Control native dialog top-layer behavior
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      setTimeout(() => {
        (document.activeElement as HTMLElement)?.blur();
        const input = dialog.querySelector('input[data-packing-input="true"]') as HTMLInputElement | null;
        if (input) {
          input.setAttribute('tabindex', '0');
          input.focus();
          input.select();
        }
      }, 200);
    } else {
      dialog.close();
    }

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  // Auto-scroll and focus newly added input
  useEffect(() => {
    if (lastAddedInputRef.current) {
      setTimeout(() => {
        const newInput = document.querySelector(
          `input[data-piece-id="${lastAddedInputRef.current}"]`
        ) as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.select();
          newInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        lastAddedInputRef.current = null;
      }, 100);
    }
  }, [boxList, loosePieces]);

  // Detailed helpers with useCallback for performance
  const addBox = useCallback(() => setBoxList((prev) => [...prev, { id: crypto.randomUUID(), pieces: [] }]), []);
  const removeBox = useCallback((id: string) => setBoxList((prev) => prev.filter((b) => b.id !== id)), []);
  const addPiece = useCallback((boxId: string, meters: string, shouldFocus = false) => {
    const newPieceId = crypto.randomUUID();
    if (shouldFocus) {
      lastAddedInputRef.current = newPieceId;
    }
    setBoxList((prev) =>
      prev.map((b) =>
        b.id === boxId ? { ...b, pieces: [...b.pieces, { id: newPieceId, meters }] } : b
      )
    );
    return newPieceId;
  }, []);
  const updatePiece = useCallback((boxId: string, pieceId: string, value: string) =>
    setBoxList((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? { ...b, pieces: b.pieces.map((p) => (p.id === pieceId ? { ...p, meters: value } : p)) }
          : b
      )
    ), []);
  const removePiece = useCallback((boxId: string, pieceId: string) =>
    setBoxList((prev) =>
      prev.map((b) =>
        b.id === boxId ? { ...b, pieces: b.pieces.filter((p) => p.id !== pieceId) } : b
      )
    ), []);
  const getBoxMeters = useCallback((b: BoxState) =>
    b.pieces.reduce((sum, p) => sum + (parseFloat(p.meters) || 0), 0), []);

  // Loose helpers with useCallback
  const addLoose = useCallback(() => {
    setAddingLoose(true);
    setDraftMeters('');
  }, []);
  const confirmLoose = useCallback(() => {
    if (!draftMeters.trim()) return;
    setLoosePieces((prev) => [...prev, { id: crypto.randomUUID(), meters: draftMeters.trim() }]);
    setDraftMeters('');
    setAddingLoose(false);
  }, [draftMeters]);
  const removeLoose = useCallback((id: string) => setLoosePieces((prev) => prev.filter((p) => p.id !== id)), []);

  // Smart Enter key handler for auto-add and navigation (useCallback)
  const handleEnterKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>, boxId: string, pieceId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      // Find current box
      const currentBox = boxList.find((b) => b.id === boxId);
      if (!currentBox) return;

      // Check if this is the last piece in the box
      const currentPieceIndex = currentBox.pieces.findIndex((p) => p.id === pieceId);
      const isLastPiece = currentPieceIndex === currentBox.pieces.length - 1;

      if (isLastPiece) {
        // Auto-add new piece and focus it
        addPiece(boxId, '', true);
      } else {
        // Move to next input
        const inputs = document.querySelectorAll('input[data-packing-input="true"]');
        const currentIndex = Array.from(inputs).indexOf(e.currentTarget);
        const nextInput = inputs[currentIndex + 1] as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  }, [boxList, addPiece]);

  // Enter key handler for loose pieces (useCallback)
  const handleLooseEnterKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>, pieceId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      // Check if this is the last loose piece
      const currentPieceIndex = loosePieces.findIndex((p) => p.id === pieceId);
      const isLastPiece = currentPieceIndex === loosePieces.length - 1;

      if (isLastPiece) {
        // Auto-add new loose piece
        const newPieceId = crypto.randomUUID();
        lastAddedInputRef.current = newPieceId;
        setLoosePieces([...loosePieces, { id: newPieceId, meters: '' }]);
      } else {
        // Move to next input
        const inputs = document.querySelectorAll('input[data-packing-input="true"]');
        const currentIndex = Array.from(inputs).indexOf(e.currentTarget);
        const nextInput = inputs[currentIndex + 1] as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  }, [loosePieces]);

  const handleSave = useCallback(() => {
    let data: PackingEntryData;
    if (mode === 'quick') {
      // Quick mode: use the entered total values directly
      const boxesValue = parseFloat(boxes) || 0;
      const piecesValue = parseFloat(piecesPerBox) || 0;
      const metersValue = parseFloat(metersPerPiece) || 0;
      data = {
        boxes: boxesValue,
        piecesPerBox: piecesValue,
        metersPerPiece: metersValue,
        detailedBoxes: [],
        entryMode: 'quick',
        totalPieces: piecesValue,
        totalMeters: metersValue,
      };
    } else {
      // Detailed mode: Calculate total meters from all pieces
      const totalBoxes = boxList.length;
      const totalPieces =
        boxList.reduce((sum, b) => sum + b.pieces.length, 0) + loosePieces.length;
      
      // CRITICAL FIX: Calculate total meters from ALL pieces in boxes AND loose pieces
      const totalMetersFromBoxes = boxList.reduce((sum, b) => {
        return sum + b.pieces.reduce((boxSum, p) => boxSum + (parseFloat(p.meters) || 0), 0);
      }, 0);
      const totalMetersFromLoose = loosePieces.reduce((sum, p) => sum + (parseFloat(p.meters) || 0), 0);
      const totalMeters = totalMetersFromBoxes + totalMetersFromLoose;
      
      const avgPiecesPerBox = totalBoxes > 0 ? totalPieces / totalBoxes : 0;
      const avgMetersPerPiece = totalPieces > 0 ? totalMeters / totalPieces : 0;
      
      const calcTotalPieces = boxList.reduce((sum, b) => sum + b.pieces.length, 0) + loosePieces.length;
      const calcTotalMeters = totalMetersFromBoxes + totalMetersFromLoose;
      
      data = {
        boxes: totalBoxes,
        piecesPerBox: avgPiecesPerBox,
        metersPerPiece: avgMetersPerPiece, // This is now the average, but we also store detailed
        detailedBoxes: boxList.map((b) => {
          const boxMeters = b.pieces.reduce((sum, p) => sum + (parseFloat(p.meters) || 0), 0);
          return {
            id: b.id,
            pieces: b.pieces.length,
            metersPerPiece: b.pieces.length > 0 ? boxMeters / b.pieces.length : 0,
            individualMeters: b.pieces.map((p) => parseFloat(p.meters) || 0),
          };
        }),
        entryMode: 'detailed',
        totalPieces: calcTotalPieces,
        totalMeters: calcTotalMeters,
      };
      
      if (totalBoxes === 0 && loosePieces.length === 0) {
        data.boxes = 0;
        data.piecesPerBox = 0;
        data.metersPerPiece = 0;
        data.totalPieces = 0;
        data.totalMeters = 0;
      }
    }
    onSave(data);
    onClose();
  }, [mode, boxes, piecesPerBox, metersPerPiece, boxList, loosePieces, onSave, onClose]);

  // Calculate totals with useMemo for performance
  const totalBoxes = useMemo(() => 
    mode === 'detailed' ? boxList.length : parseFloat(boxes) || 0,
    [mode, boxList.length, boxes]
  );
  
  const totalPieces = useMemo(() => 
    mode === 'detailed'
      ? boxList.reduce((sum, b) => sum + b.pieces.length, 0) + loosePieces.length
      : parseFloat(piecesPerBox) || 0,
    [mode, boxList, loosePieces.length, piecesPerBox]
  );
  
  const totalMeters = useMemo(() => {
    if (mode === 'detailed') {
      const boxMeters = boxList.reduce((sum, b) => 
        sum + b.pieces.reduce((pSum, p) => pSum + (parseFloat(p.meters) || 0), 0), 0
      );
      const looseMeters = loosePieces.reduce((sum, p) => sum + (parseFloat(p.meters) || 0), 0);
      return parseFloat((boxMeters + looseMeters).toFixed(2));
    }
    return parseFloat(metersPerPiece) || 0;
  }, [mode, boxList, loosePieces, metersPerPiece]);
  
  const avgMeterPerPiece = useMemo(() => 
    totalPieces > 0 ? parseFloat((totalMeters / totalPieces).toFixed(2)) : 0,
    [totalPieces, totalMeters]
  );

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/80 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f172a] text-white p-0 rounded-xl shadow-2xl outline-none z-[99999] w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-700 bg-[#1e293b]">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/50">
              <BoxIcon size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Packing Entry</h3>
              <p className="text-sm text-slate-400 mt-1">
                Enter box, piece, and meter details for{' '}
                <span className="text-indigo-400 font-semibold">{productName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 bg-[#0f172a]">
          <div className="flex gap-2 border-b border-slate-700 pb-2">
            <button
              type="button"
              onClick={() => !lockedMode || lockedMode === 'detailed' ? setMode('detailed') : null}
              disabled={lockedMode === 'quick'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'detailed'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/50'
                  : lockedMode === 'quick'
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <BoxIcon size={16} />
              Detailed Entry
              {lockedMode === 'quick' && (
                <span className="ml-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Locked</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => !lockedMode || lockedMode === 'quick' ? setMode('quick') : null}
              disabled={lockedMode === 'detailed'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'quick'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/50'
                  : lockedMode === 'detailed'
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <Zap size={16} />
              Quick / Lump Sum
              {lockedMode === 'detailed' && (
                <span className="ml-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Locked</span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-4 bg-[#0f172a]">
          {mode === 'quick' ? (
            <div className="space-y-5">
              {/* Quick Entry Header */}
              <div className="flex items-center gap-2 text-blue-400 mb-4">
                <Zap size={18} />
                <span className="text-sm font-semibold">Quick Entry - Enter Summary Totals</span>
              </div>

              {/* Number of Boxes */}
              <div>
                <label className="block text-sm font-medium text-white mb-2.5">
                  Number of Boxes
                </label>
                <div className="relative group">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-opacity duration-200 pointer-events-none ${boxes ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-0'}`}>
                    <BoxIcon size={18} />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={boxes}
                    onChange={(e) => setBoxes(e.target.value)}
                    onInput={(e) => {
                      e.stopPropagation();
                      setBoxes((e.target as HTMLInputElement).value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const inputs = document.querySelectorAll('input[data-packing-input="true"]');
                        const currentIndex = Array.from(inputs).indexOf(e.currentTarget);
                        const nextInput = inputs[currentIndex + 1] as HTMLInputElement;
                        if (nextInput) {
                          nextInput.focus();
                          nextInput.select();
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.focus();
                    }}
                    placeholder="2"
                    data-packing-input="true"
                    tabIndex={0}
                    className="w-full bg-[#0f1628] text-white border border-gray-700/50 rounded-lg pl-12 pr-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-600"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Number of Pieces */}
              <div>
                <label className="block text-sm font-medium text-white mb-2.5">
                  Number of Pieces
                </label>
                <div className="relative group">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-opacity duration-200 pointer-events-none ${piecesPerBox ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-0'}`}>
                    <Layers size={18} />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={piecesPerBox}
                    onChange={(e) => setPiecesPerBox(e.target.value)}
                    onInput={(e) => {
                      e.stopPropagation();
                      setPiecesPerBox((e.target as HTMLInputElement).value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const inputs = document.querySelectorAll('input[data-packing-input="true"]');
                        const currentIndex = Array.from(inputs).indexOf(e.currentTarget);
                        const nextInput = inputs[currentIndex + 1] as HTMLInputElement;
                        if (nextInput) {
                          nextInput.focus();
                          nextInput.select();
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.focus();
                    }}
                    placeholder="50"
                    data-packing-input="true"
                    tabIndex={0}
                    className="w-full bg-[#0f1628] text-white border border-gray-700/50 rounded-lg pl-12 pr-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-600"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Total Meters */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-medium text-white">Total Meters</label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs font-semibold text-yellow-400">
                    <Zap size={12} />
                    Critical for Billing
                  </span>
                </div>
                <div className="relative group">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-green-500 transition-opacity duration-200 pointer-events-none ${metersPerPiece ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-0'}`}>
                    <Ruler size={18} />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={metersPerPiece}
                    onChange={(e) => setMetersPerPiece(e.target.value)}
                    onInput={(e) => {
                      e.stopPropagation();
                      setMetersPerPiece((e.target as HTMLInputElement).value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const inputs = document.querySelectorAll('input[data-packing-input="true"]');
                        const currentIndex = Array.from(inputs).indexOf(e.currentTarget);
                        const nextInput = inputs[currentIndex + 1] as HTMLInputElement;
                        if (nextInput) {
                          nextInput.focus();
                          nextInput.select();
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.focus();
                    }}
                    placeholder="6"
                    data-packing-input="true"
                    tabIndex={0}
                    className="w-full bg-[#0f1628] text-white border border-gray-700/50 rounded-lg pl-12 pr-16 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-600"
                    autoComplete="off"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-bold text-sm">
                    M
                  </div>
                </div>
              </div>

              {/* Average Calculation */}
              {totalPieces > 0 && totalMeters > 0 && (
                <div className="bg-[#0f1628] border border-gray-700/50 rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Average Meter per Piece:</span>
                    <span className="text-purple-400 text-lg font-bold">~{avgMeterPerPiece.toFixed(2)} M</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Calculated as: {totalMeters.toFixed(2)} M ÷ {totalPieces} pieces
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-950/50 border border-blue-800/30 rounded-lg p-4 flex gap-3">
                <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-300">
                  <span className="font-semibold text-blue-200">Quick Entry Mode:</span> Perfect for when you
                  already know the totals and don't need detailed piece-by-piece tracking.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Boxes Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white">
                    <BoxIcon size={18} className="text-indigo-400" />
                    <span className="text-sm font-semibold">Boxes</span>
                  </div>
                  <button
                    type="button"
                    onClick={addBox}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/50 hover:shadow-xl hover:shadow-indigo-600/60 transition-all"
                  >
                    <Plus size={16} />
                    Add Box
                  </button>
                </div>

                {boxList.map((b, idx) => (
                  <div key={b.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-3 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all">
                    {/* Box Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 text-white font-bold text-sm rounded-lg shadow-md shadow-indigo-600/50">
                          #{idx + 1}
                        </span>
                        <span className="text-slate-300 text-sm font-medium">
                          {b.pieces.length} Pieces • <span className="text-indigo-400 font-bold">{parseFloat(getBoxMeters(b).toFixed(2))} M</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBox(b.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1.5 rounded-lg transition-colors"
                        aria-label="Delete box"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Pieces Grid */}
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {b.pieces.map((p, pIdx) => (
                        <div key={p.id} className="relative group">
                          {/* Icon that hides on focus/value */}
                          <div className={`absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 transition-opacity duration-200 pointer-events-none ${p.meters ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-0'}`}>
                            <Link2 size={12} />
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={p.meters}
                            onChange={(e) => updatePiece(b.id, p.id, e.target.value)}
                            onInput={(e) => {
                              e.stopPropagation();
                              updatePiece(b.id, p.id, (e.target as HTMLInputElement).value);
                            }}
                            onKeyDown={(e) => handleEnterKey(e, b.id, p.id)}
                            onFocus={(e) => {
                              if (e.target.value === '0' || e.target.value === '0.00') {
                                e.target.value = '';
                                updatePiece(b.id, p.id, '');
                              }
                            }}
                            onBlur={(e) => {
                              // Auto-format to 2 decimal places on blur
                              const value = e.target.value.trim();
                              if (value && !isNaN(parseFloat(value))) {
                                const formatted = parseFloat(value).toFixed(2);
                                updatePiece(b.id, p.id, formatted);
                              }
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.currentTarget.focus();
                            }}
                            placeholder="0.00"
                            data-packing-input="true"
                            data-piece-id={p.id}
                            tabIndex={0}
                            className={`w-full bg-slate-900 text-white border border-slate-700 rounded-lg ${p.meters ? 'pl-2' : 'pl-8'} pr-11 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:pl-2 placeholder:text-slate-600 transition-all duration-200`}
                            autoComplete="off"
                          />
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-400 text-xs font-bold pointer-events-none">
                            M
                          </div>
                          <button
                            type="button"
                            onClick={() => removePiece(b.id, p.id)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300 transition-colors z-10"
                            aria-label="Remove piece"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Piece Button */}
                    <button
                      type="button"
                      onClick={() => {
                        addPiece(b.id, '', true);
                      }}
                      className="w-full border-2 border-dashed border-slate-600 rounded-lg py-2.5 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Plus size={16} />
                      Add Piece
                    </button>
                  </div>
                ))}
              </div>

              {/* Loose Pieces Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-white">
                    <Layers size={18} className="text-purple-400" />
                    <span className="text-sm font-semibold">Loose Pieces (No Box)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newPieceId = crypto.randomUUID();
                      lastAddedInputRef.current = newPieceId;
                      setLoosePieces([...loosePieces, { id: newPieceId, meters: '' }]);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-purple-600/50 hover:shadow-xl hover:shadow-purple-600/60 transition-all"
                  >
                    <Plus size={16} />
                    Add Piece
                  </button>
                </div>

                {loosePieces.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {loosePieces.map((p, idx) => (
                      <div key={p.id} className="relative group">
                        {/* Icon that hides on focus/value */}
                        <div className={`absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 transition-opacity duration-200 pointer-events-none ${p.meters ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-0'}`}>
                          <Link2 size={12} />
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={p.meters}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setLoosePieces(loosePieces.map((lp) => (lp.id === p.id ? { ...lp, meters: newValue } : lp)));
                          }}
                          onInput={(e) => {
                            e.stopPropagation();
                            const newValue = (e.target as HTMLInputElement).value;
                            setLoosePieces(loosePieces.map((lp) => (lp.id === p.id ? { ...lp, meters: newValue } : lp)));
                          }}
                          onKeyDown={(e) => handleLooseEnterKey(e, p.id)}
                          onFocus={(e) => {
                            if (e.target.value === '0' || e.target.value === '0.00') {
                              e.target.value = '';
                              setLoosePieces(loosePieces.map((lp) => (lp.id === p.id ? { ...lp, meters: '' } : lp)));
                            }
                          }}
                          onBlur={(e) => {
                            // Auto-format to 2 decimal places on blur
                            const value = e.target.value.trim();
                            if (value && !isNaN(parseFloat(value))) {
                              const formatted = parseFloat(value).toFixed(2);
                              setLoosePieces(loosePieces.map((lp) => (lp.id === p.id ? { ...lp, meters: formatted } : lp)));
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.currentTarget.focus();
                          }}
                          placeholder="0.00"
                          data-packing-input="true"
                          data-piece-id={p.id}
                          tabIndex={0}
                          className={`w-full bg-slate-900 text-white border border-slate-700 rounded-lg ${p.meters ? 'pl-2' : 'pl-8'} pr-11 py-2.5 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:pl-2 placeholder:text-slate-600 transition-all duration-200`}
                          autoComplete="off"
                        />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-bold pointer-events-none">
                          M
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLoose(p.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300 transition-colors z-10"
                          aria-label="Remove loose piece"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="border-t border-slate-700 px-6 py-4 space-y-4 bg-[#1e293b]">
          {/* Summary Bar */}
          <div className="grid grid-cols-3 gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 shadow-lg">
            <div className="text-center">
              <div className="text-xs text-slate-400 font-medium mb-1">Total Boxes</div>
              <div className="text-2xl font-bold text-indigo-400">{totalBoxes}</div>
            </div>
            <div className="text-center border-l border-r border-slate-700">
              <div className="text-xs text-slate-400 font-medium mb-1">Total Pieces</div>
              <div className="text-2xl font-bold text-purple-400">{totalPieces}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 font-medium mb-1">Total Meters</div>
              <div className="text-2xl font-bold text-green-400">{totalMeters.toFixed(2)}</div>
            </div>
          </div>

          {/* Tip Box (only in detailed mode) */}
          {mode === 'detailed' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
              <Lightbulb size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-amber-300">Tip:</span> Press{' '}
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-semibold text-indigo-400 shadow-sm">
                  Enter
                </kbd>{' '}
                on the last meter box to automatically add a new piece.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-semibold transition-all border border-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-600/50 hover:shadow-xl hover:shadow-indigo-600/60"
            >
              Save Packing
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
