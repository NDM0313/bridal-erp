/**
 * Packing Overlay Component
 * Professional, high-performance overlay with perfect focus management
 * Full rebuild with layered UI, stable keys, and smooth sequential focus
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Box, Plus, Trash2, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BoxEntry {
  id: string;
  pieces: Array<{ id: string; meters: string }>;
}

interface PackingData {
  boxes: BoxEntry[];
  loosePieces: Array<{ id: string; meters: string }>;
  totalBoxes: number;
  totalPieces: number;
  totalMeters: number;
}

interface PackingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PackingData) => void;
  productName: string;
  productSku: string;
  initialData?: PackingData | null;
}

type EntryMode = 'detailed' | 'quick';

export function PackingOverlay({
  isOpen,
  onClose,
  onSave,
  productName,
  productSku,
  initialData,
}: PackingOverlayProps) {
  // Focus management state
  const [activeFocusId, setActiveFocusId] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  
  const [entryMode, setEntryMode] = useState<EntryMode>('detailed');
  const [boxes, setBoxes] = useState<BoxEntry[]>([]);
  const [loosePieces, setLoosePieces] = useState<Array<{ id: string; meters: string }>>([]);
  const [quickBoxes, setQuickBoxes] = useState('');
  const [quickPieces, setQuickPieces] = useState('');
  const [quickMeters, setQuickMeters] = useState('');

  // Load initial data
  useEffect(() => {
    if (isOpen && initialData) {
      const hasDetailedData = 
        (initialData.boxes && initialData.boxes.length > 0) ||
        (initialData.loosePieces && initialData.loosePieces.length > 0);
      
      if (hasDetailedData) {
        if (initialData.boxes && initialData.boxes.length > 0) {
          setBoxes(initialData.boxes.map(box => ({
            id: box.id || crypto.randomUUID(),
            pieces: box.pieces.map(p => ({
              id: p.id || crypto.randomUUID(),
              meters: typeof p.meters === 'number' ? p.meters.toString() : (p.meters || '')
            }))
          })));
        } else {
          setBoxes([]);
        }
        if (initialData.loosePieces && initialData.loosePieces.length > 0) {
          setLoosePieces(initialData.loosePieces.map(p => ({
            id: p.id || crypto.randomUUID(),
            meters: typeof p.meters === 'number' ? p.meters.toString() : (p.meters || '')
          })));
        } else {
          setLoosePieces([]);
        }
        setEntryMode('detailed');
      } else {
        if (initialData.totalBoxes > 0 || initialData.totalPieces > 0 || initialData.totalMeters > 0) {
          setQuickBoxes(initialData.totalBoxes > 0 ? initialData.totalBoxes.toString() : '');
          setQuickPieces(initialData.totalPieces > 0 ? initialData.totalPieces.toString() : '');
          setQuickMeters(initialData.totalMeters > 0 ? initialData.totalMeters.toString() : '');
          setEntryMode('quick');
        } else {
          setBoxes([]);
          setLoosePieces([]);
          setQuickBoxes('');
          setQuickPieces('');
          setQuickMeters('');
          setEntryMode('detailed');
        }
      }
    } else if (isOpen && !initialData) {
      setBoxes([]);
      setLoosePieces([]);
      setQuickBoxes('');
      setQuickPieces('');
      setQuickMeters('');
      setEntryMode('detailed');
    }
  }, [isOpen, initialData]);

  // Smooth Sequential Focus: Focus on newly added input
  useEffect(() => {
    if (activeFocusId) {
      const timer = setTimeout(() => {
        const input = inputRefs.current.get(activeFocusId);
        if (input) {
          input.focus();
          input.select();
        }
        setActiveFocusId(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeFocusId]);

  // Register input ref
  const registerInputRef = (id: string, element: HTMLInputElement | null) => {
    if (element) {
      inputRefs.current.set(id, element);
    } else {
      inputRefs.current.delete(id);
    }
  };

  const calculateTotals = (): PackingData => {
    if (entryMode === 'quick') {
      const totalBoxes = parseFloat(quickBoxes) || 0;
      const totalPieces = parseFloat(quickPieces) || 0;
      const totalMeters = parseFloat(quickMeters) || 0;
      
      return {
        boxes: [],
        loosePieces: [],
        totalBoxes,
        totalPieces,
        totalMeters,
      };
    }

    const totalBoxes = boxes.length;
    const totalPieces = boxes.reduce((sum, box) => sum + box.pieces.length, 0) + loosePieces.length;
    const totalMeters = 
      boxes.reduce((sum, box) => 
        sum + box.pieces.reduce((pSum, piece) => pSum + (parseFloat(piece.meters) || 0), 0), 0
      ) + loosePieces.reduce((sum, piece) => sum + (parseFloat(piece.meters) || 0), 0);

    return {
      boxes: boxes.map(box => ({
        ...box,
        pieces: box.pieces.map(p => ({
          id: p.id,
          meters: parseFloat(p.meters) || 0
        }))
      })),
      loosePieces: loosePieces.map(p => ({
        id: p.id,
        meters: parseFloat(p.meters) || 0
      })),
      totalBoxes,
      totalPieces,
      totalMeters,
    };
  };

  const handleAddBox = () => {
    const newBox: BoxEntry = {
      id: crypto.randomUUID(),
      pieces: [],
    };
    setBoxes([...boxes, newBox]);
  };

  const handleAddPieceToBox = (boxId: string) => {
    const newPieceId = crypto.randomUUID();
    setBoxes(boxes.map(box => 
      box.id === boxId
        ? {
            ...box,
            pieces: [...box.pieces, { id: newPieceId, meters: '' }],
          }
        : box
    ));
    // Set focus to new piece input
    setActiveFocusId(newPieceId);
  };

  const handleUpdatePieceMeters = (boxId: string, pieceId: string, value: string) => {
    setBoxes(boxes.map(box =>
      box.id === boxId
        ? {
            ...box,
            pieces: box.pieces.map(piece =>
              piece.id === pieceId ? { ...piece, meters: value } : piece
            ),
          }
        : box
    ));
  };

  const handleRemovePiece = (boxId: string, pieceId: string) => {
    setBoxes(boxes.map(box =>
      box.id === boxId
        ? {
            ...box,
            pieces: box.pieces.filter(p => p.id !== pieceId),
          }
        : box
    ));
  };

  const handleRemoveBox = (boxId: string) => {
    setBoxes(boxes.filter(b => b.id !== boxId));
  };

  const handleAddLoosePiece = () => {
    const newPieceId = crypto.randomUUID();
    setLoosePieces([...loosePieces, { id: newPieceId, meters: '' }]);
    // Set focus to new loose piece input
    setActiveFocusId(newPieceId);
  };

  const handleUpdateLoosePieceMeters = (pieceId: string, value: string) => {
    setLoosePieces(loosePieces.map(piece =>
      piece.id === pieceId ? { ...piece, meters: value } : piece
    ));
  };

  const handleRemoveLoosePiece = (pieceId: string) => {
    setLoosePieces(loosePieces.filter(p => p.id !== pieceId));
  };

  const handleSave = () => {
    const data = calculateTotals();
    onSave(data);
    handleReset();
  };

  const handleReset = () => {
    setBoxes([]);
    setLoosePieces([]);
    setQuickBoxes('');
    setQuickPieces('');
    setQuickMeters('');
    setActiveFocusId(null);
    inputRefs.current.clear();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const totals = calculateTotals();

  // Auto-focus on first input when overlay opens
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus on first input after a short delay
      const timer = setTimeout(() => {
        if (entryMode === 'detailed') {
          // Find first piece input in first box, or first loose piece
          if (boxes.length > 0 && boxes[0].pieces.length > 0) {
            const firstPieceId = boxes[0].pieces[0].id;
            const input = inputRefs.current.get(firstPieceId);
            if (input) {
              input.focus();
              input.select();
            }
          } else if (loosePieces.length > 0) {
            const firstLooseId = loosePieces[0].id;
            const input = inputRefs.current.get(firstLooseId);
            if (input) {
              input.focus();
              input.select();
            }
          }
        } else {
          // Quick mode - focus on first input
          const firstInput = document.querySelector('input[type="number"][placeholder="0"]') as HTMLInputElement;
          if (firstInput) {
            firstInput.focus();
            firstInput.select();
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, entryMode, boxes, loosePieces]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-gray-950 w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl flex flex-col border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Back Button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Box className="w-6 h-6 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Packing Entry</h2>
            </div>
            <p className="text-sm text-gray-400">
              Enter box, piece, and meter details for{' '}
              <span className="text-orange-400 font-medium">{productName}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-sm opacity-70 hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
        {/* Entry Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setEntryMode('detailed')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
              entryMode === 'detailed'
                ? 'bg-orange-600 border-orange-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
            }`}
          >
            <Box className="w-4 h-4" />
            <span className="font-medium">Detailed Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('quick')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
              entryMode === 'quick'
                ? 'bg-orange-600 border-orange-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="font-medium">Quick / Lump Sum</span>
          </button>
        </div>

        {entryMode === 'detailed' ? (
          <div className="space-y-6">
            {/* Boxes Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-orange-400" />
                  <h3 className="text-white font-medium">Boxes</h3>
                </div>
                <Button
                  type="button"
                  onClick={handleAddBox}
                  className="bg-orange-600 hover:bg-orange-500 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add Box
                </Button>
              </div>

              {boxes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No boxes added. Click "Add Box" to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {boxes.map((box, boxIndex) => (
                    <div key={box.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-orange-400" />
                          <span className="text-white font-medium">Box {boxIndex + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => handleAddPieceToBox(box.id)}
                            size="sm"
                            className="bg-gray-700 hover:bg-gray-600 text-white"
                          >
                            <Plus size={14} className="mr-1" />
                            Add Piece
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleRemoveBox(box.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-400 hover:text-red-300 border-red-400/20"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {box.pieces.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No pieces in this box. Click "Add Piece" to add.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {box.pieces.map((piece, pieceIndex) => (
                            <div key={piece.id} className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm w-8">#{pieceIndex + 1}</span>
                              <input
                                ref={(el) => registerInputRef(piece.id, el)}
                                type="number"
                                min="0"
                                step="0.01"
                                value={piece.meters}
                                autoFocus={boxIndex === 0 && pieceIndex === 0 && boxes.length > 0 && boxes[0].pieces.length === 1}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUpdatePieceMeters(box.id, piece.id, e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  // Tab navigation: Move to next piece or loose piece
                                  if (e.key === 'Tab' && !e.shiftKey) {
                                    const currentIndex = box.pieces.findIndex(p => p.id === piece.id);
                                    if (currentIndex < box.pieces.length - 1) {
                                      // Next piece in same box
                                      const nextPiece = box.pieces[currentIndex + 1];
                                      if (nextPiece) {
                                        e.preventDefault();
                                        setTimeout(() => {
                                          const nextInput = inputRefs.current.get(nextPiece.id);
                                          nextInput?.focus();
                                          nextInput?.select();
                                        }, 0);
                                      }
                                    } else {
                                      // Last piece in box, move to first loose piece
                                      if (loosePieces.length > 0) {
                                        e.preventDefault();
                                        setTimeout(() => {
                                          const firstLooseInput = inputRefs.current.get(loosePieces[0].id);
                                          firstLooseInput?.focus();
                                          firstLooseInput?.select();
                                        }, 0);
                                      }
                                    }
                                  }
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                placeholder="Meters"
                                className="flex-1 bg-gray-900 border border-gray-800 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <span className="text-gray-400 text-sm">M</span>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePiece(box.id, piece.id);
                                }}
                                size="sm"
                                variant="outline"
                                className="text-red-400 hover:text-red-300 border-red-400/20"
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loose Pieces Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-orange-400" />
                  <h3 className="text-white font-medium">Loose Pieces</h3>
                </div>
                <Button
                  type="button"
                  onClick={handleAddLoosePiece}
                  className="bg-orange-600 hover:bg-orange-500 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add Loose Piece
                </Button>
              </div>

              {loosePieces.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No loose pieces added. Click "Add Loose Piece" to start.
                </div>
              ) : (
                <div className="space-y-2">
                  {loosePieces.map((piece, index) => (
                    <div key={piece.id} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                      <span className="text-gray-400 text-sm w-8">#{index + 1}</span>
                      <input
                        ref={(el) => registerInputRef(piece.id, el)}
                        type="number"
                        min="0"
                        step="0.01"
                        value={piece.meters}
                        autoFocus={index === 0 && boxes.length === 0 && loosePieces.length === 1}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateLoosePieceMeters(piece.id, e.target.value);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          // Tab navigation: Move to next loose piece
                          if (e.key === 'Tab' && !e.shiftKey) {
                            const currentIndex = loosePieces.findIndex(p => p.id === piece.id);
                            if (currentIndex < loosePieces.length - 1) {
                              const nextPiece = loosePieces[currentIndex + 1];
                              if (nextPiece) {
                                e.preventDefault();
                                setTimeout(() => {
                                  const nextInput = inputRefs.current.get(nextPiece.id);
                                  nextInput?.focus();
                                  nextInput?.select();
                                }, 0);
                              }
                            }
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        placeholder="Meters"
                        className="flex-1 bg-gray-900 border border-gray-800 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-gray-400 text-sm">M</span>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLoosePiece(piece.id);
                        }}
                        size="sm"
                        variant="outline"
                        className="text-red-400 hover:text-red-300 border-red-400/20"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Total Boxes</label>
              <input
                type="number"
                min="0"
                value={quickBoxes}
                onChange={(e) => {
                  e.stopPropagation();
                  setQuickBoxes(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.target.select();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                placeholder="0"
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-md px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Total Pieces</label>
              <input
                type="number"
                min="0"
                value={quickPieces}
                onChange={(e) => {
                  e.stopPropagation();
                  setQuickPieces(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.target.select();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                placeholder="0"
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-md px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Total Meters</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quickMeters}
                onChange={(e) => {
                  e.stopPropagation();
                  setQuickMeters(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.target.select();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                placeholder="0"
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-md px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Total Boxes:</span>
              <span className="text-white font-medium">{totals.totalBoxes}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total Pieces:</span>
              <span className="text-white font-medium">{totals.totalPieces}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total Meters:</span>
              <span className="text-white font-medium">{totals.totalMeters.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-gray-950 border-t border-gray-800 p-6 flex items-center justify-end gap-3 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-orange-600 hover:bg-orange-500 text-white"
          >
            <Box size={16} className="mr-2" />
            Save Packing
          </Button>
        </div>
      </div>
    </div>
  );
}
