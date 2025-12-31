/**
 * Packing Entry Dialog Component
 * Allows flexible entry of Box, PC (Pieces), and Meters
 * Supports both Detailed Entry and Quick/Lump Sum modes
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Box, Layers, Ruler, Plus, Minus, Trash2, Zap, Info, Lightbulb, Grid3x3, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface BoxEntry {
  id: string;
  pieces: Array<{ id: string; meters: number }>;
}

interface PackingData {
  boxes: BoxEntry[];
  loosePieces: Array<{ id: string; meters: number }>;
  totalBoxes: number;
  totalPieces: number;
  totalMeters: number;
}

interface PackingEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PackingData) => void;
  productName: string;
  productSku: string;
  initialData?: PackingData | null; // Load saved packing data when reopening
}

type EntryMode = 'detailed' | 'quick';
type ViewMode = 'grid' | 'list';

export function PackingEntryDialog({
  isOpen,
  onClose,
  onSave,
  productName,
  productSku,
  initialData,
}: PackingEntryDialogProps) {
  // Determine initial entry mode from initialData
  const getInitialMode = (): EntryMode => {
    if (initialData) {
      // If initialData has boxes/loosePieces arrays, it's detailed mode
      if (initialData.boxes && initialData.boxes.length > 0) return 'detailed';
      if (initialData.loosePieces && initialData.loosePieces.length > 0) return 'detailed';
      // Otherwise, it's quick mode
      return 'quick';
    }
    return 'detailed';
  };

  const [entryMode, setEntryMode] = useState<EntryMode>(getInitialMode());
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // Grid or List view for pieces
  
  // Detailed Entry State
  const [boxes, setBoxes] = useState<BoxEntry[]>([]);
  const [loosePieces, setLoosePieces] = useState<Array<{ id: string; meters: number }>>([]);
  
  // Quick Entry State
  const [quickBoxes, setQuickBoxes] = useState<string>('');
  const [quickPieces, setQuickPieces] = useState<string>('');
  const [quickMeters, setQuickMeters] = useState<string>('');

  // Refs for auto-focus on Enter
  const pieceInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Local state to track input string values for decimal inputs (preserves typing state)
  const [pieceInputValues, setPieceInputValues] = useState<{ [key: string]: string }>({});

  // Load initial data when dialog opens or initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      // Check if we have detailed data (boxes or loosePieces arrays with data)
      const hasDetailedData = 
        (initialData.boxes && initialData.boxes.length > 0) ||
        (initialData.loosePieces && initialData.loosePieces.length > 0);
      
      if (hasDetailedData) {
        // Load detailed mode data
        if (initialData.boxes && initialData.boxes.length > 0) {
          setBoxes(initialData.boxes);
        } else {
          setBoxes([]);
        }
        if (initialData.loosePieces && initialData.loosePieces.length > 0) {
          setLoosePieces(initialData.loosePieces);
        } else {
          setLoosePieces([]);
        }
        setEntryMode('detailed');
      } else {
        // Load quick mode data (if no detailed data exists but totals exist)
        if (initialData.totalBoxes > 0 || initialData.totalPieces > 0 || initialData.totalMeters > 0) {
          setQuickBoxes(initialData.totalBoxes > 0 ? initialData.totalBoxes.toString() : '');
          setQuickPieces(initialData.totalPieces > 0 ? initialData.totalPieces.toString() : '');
          setQuickMeters(initialData.totalMeters > 0 ? initialData.totalMeters.toString() : '');
          setEntryMode('quick');
        } else {
          // No data, reset to default
          setBoxes([]);
          setLoosePieces([]);
          setQuickBoxes('');
          setQuickPieces('');
          setQuickMeters('');
          setEntryMode('detailed');
        }
      }
    } else if (isOpen && !initialData) {
      // Reset if no initial data
      setBoxes([]);
      setLoosePieces([]);
      setQuickBoxes('');
      setQuickPieces('');
      setQuickMeters('');
      setEntryMode('detailed');
      setPieceInputValues({});
    }
  }, [isOpen, initialData]);

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

    // Detailed mode calculations
    const totalBoxes = boxes.length;
    // Count pieces - each piece counts as 1, but we can have decimal pieces in future
    // For now, count each piece entry as 1 unit
    const totalPieces = boxes.reduce((sum, box) => sum + box.pieces.length, 0) + loosePieces.length;
    const totalMeters = 
      boxes.reduce((sum, box) => 
        sum + box.pieces.reduce((pSum, piece) => pSum + piece.meters, 0), 0
      ) + loosePieces.reduce((sum, piece) => sum + piece.meters, 0);

    return {
      boxes,
      loosePieces,
      totalBoxes,
      totalPieces,
      totalMeters,
    };
  };

  const totals = calculateTotals();

  const handleAddBox = () => {
    const newBox: BoxEntry = {
      id: `box-${Date.now()}`,
      pieces: [],
    };
    setBoxes([...boxes, newBox]);
  };

  const handleAddPieceToBox = (boxId: string) => {
    const newPieceId = `piece-${Date.now()}`;
    setBoxes(boxes.map(box => 
      box.id === boxId
        ? {
            ...box,
            pieces: [...box.pieces, { id: newPieceId, meters: 0 }],
          }
        : box
    ));
    
    // Auto-focus the new piece input
    setTimeout(() => {
      const newInput = pieceInputRefs.current[`${boxId}-${newPieceId}`];
      if (newInput) {
        newInput.focus();
        newInput.select();
      }
    }, 10);
  };

  // Helper function to remove leading zeros from numeric input (preserves decimals)
  const normalizeNumericInput = (value: string): number => {
    if (!value || value === '' || value === '.') return 0;
    // Remove leading zeros but keep at least one digit if all zeros, preserve decimals
    const cleaned = value.replace(/^0+(?=\d)/, '') || '0';
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Format display value - preserve decimals
  const formatDisplayValue = (num: number): string => {
    if (num === 0) return '';
    // Preserve decimals - return as string to keep decimal places
    return num.toString();
  };

  const handleUpdatePieceMeters = (boxId: string, pieceId: string, meters: number, shouldAutoFocus = false, inputString?: string) => {
    const pieceKey = `${boxId}-${pieceId}`;
    
    // Update the input string value if provided (for decimal typing)
    if (inputString !== undefined) {
      setPieceInputValues(prev => ({ ...prev, [pieceKey]: inputString }));
    } else {
      // Clear the input string when value is finalized
      setPieceInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[pieceKey];
        return newValues;
      });
    }
    
    setBoxes(boxes.map(box =>
      box.id === boxId
        ? {
            ...box,
            pieces: box.pieces.map(piece =>
              piece.id === pieceId ? { ...piece, meters } : piece
            ),
          }
        : box
    ));

    // Auto-focus to next piece if Enter was pressed
    if (shouldAutoFocus) {
      const box = boxes.find(b => b.id === boxId);
      if (box) {
        const currentIndex = box.pieces.findIndex(p => p.id === pieceId);
        const nextPiece = box.pieces[currentIndex + 1];
        if (nextPiece) {
          setTimeout(() => {
            const nextInput = pieceInputRefs.current[`${boxId}-${nextPiece.id}`];
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
            }
          }, 10);
        } else {
          // If last piece in box, add new piece and focus it
          handleAddPieceToBox(boxId);
        }
      }
    }
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
    const newPieceId = `loose-${Date.now()}`;
    setLoosePieces([...loosePieces, { id: newPieceId, meters: 0 }]);
    
    // Auto-focus the new loose piece input
    setTimeout(() => {
      const newInput = pieceInputRefs.current[`loose-${newPieceId}`];
      if (newInput) {
        newInput.focus();
        newInput.select();
      }
    }, 10);
  };

  const handleUpdateLoosePieceMeters = (pieceId: string, meters: number, shouldAutoFocus = false, inputString?: string) => {
    const pieceKey = `loose-${pieceId}`;
    
    // Update the input string value if provided (for decimal typing)
    if (inputString !== undefined) {
      setPieceInputValues(prev => ({ ...prev, [pieceKey]: inputString }));
    } else {
      // Clear the input string when value is finalized
      setPieceInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[pieceKey];
        return newValues;
      });
    }
    
    setLoosePieces(loosePieces.map(piece =>
      piece.id === pieceId ? { ...piece, meters } : piece
    ));

    // Auto-focus to next loose piece if Enter was pressed
    if (shouldAutoFocus) {
      const currentIndex = loosePieces.findIndex(p => p.id === pieceId);
      const nextPiece = loosePieces[currentIndex + 1];
      if (nextPiece) {
        setTimeout(() => {
          const nextInput = pieceInputRefs.current[`loose-${nextPiece.id}`];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }, 10);
      } else {
        // If last loose piece, add new one and focus it
        handleAddLoosePiece();
      }
    }
  };

  const handleRemoveLoosePiece = (pieceId: string) => {
    setLoosePieces(loosePieces.filter(p => p.id !== pieceId));
  };

  const handleSave = () => {
    try {
      const data = calculateTotals();
      
      // Ensure data structure is complete
      const completeData: PackingData = {
        boxes: data.boxes || [],
        loosePieces: data.loosePieces || [],
        totalBoxes: data.totalBoxes || 0,
        totalPieces: data.totalPieces || 0,
        totalMeters: data.totalMeters || 0,
      };
      
      onSave(completeData);
      handleReset();
    } catch (error) {
      console.error('Error saving packing data:', error);
    }
  };

  const handleReset = () => {
    setBoxes([]);
    setLoosePieces([]);
    setQuickBoxes('');
    setQuickPieces('');
    setQuickMeters('');
    setPieceInputValues({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[85vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Box className="w-6 h-6 text-blue-400" />
            <DialogTitle className="text-white">Packing Entry</DialogTitle>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Enter box, piece, and meter details for{' '}
            <span className="text-blue-400 font-medium">{productName}</span>
          </p>
        </DialogHeader>

        {/* Entry Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setEntryMode('detailed')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
              entryMode === 'detailed'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
            )}
          >
            <Box className="w-4 h-4" />
            <span className="font-medium">Detailed Entry</span>
          </button>
          <button
            onClick={() => setEntryMode('quick')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
              entryMode === 'quick'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
            )}
          >
            <Zap className="w-4 h-4" />
            <span className="font-medium">Quick / Lump Sum</span>
          </button>
        </div>

        {entryMode === 'detailed' ? (
          <>
            {/* Boxes Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-medium">Boxes</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        viewMode === 'grid'
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                      title="Grid View"
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        viewMode === 'list'
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={handleAddBox}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Box
                  </Button>
                </div>
              </div>

              {boxes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No boxes added yet. Click "Add Box" to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {boxes.map((box, boxIndex) => (
                    <div
                      key={box.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">#{boxIndex + 1}</span>
                          <span className="text-white font-medium">
                            {box.pieces.length} Piece{box.pieces.length !== 1 ? 's' : ''} •{' '}
                            {box.pieces.reduce((sum, p) => sum + p.meters, 0).toFixed(2)} M
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleAddPieceToBox(box.id)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Piece
                          </Button>
                          <Button
                            onClick={() => handleRemoveBox(box.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
                        {box.pieces.map((piece, pieceIndex) => (
                          <div
                            key={piece.id}
                            className={cn(
                              "flex items-center gap-2 bg-gray-900 rounded-lg p-2 border border-gray-800",
                              viewMode === 'list' && "w-full"
                            )}
                          >
                            <Input
                              ref={(el) => {
                                pieceInputRefs.current[`${box.id}-${piece.id}`] = el;
                              }}
                              type="text"
                              inputMode="decimal"
                              value={(() => {
                                const pieceKey = `${box.id}-${piece.id}`;
                                // If user is currently typing, use the input string value
                                if (pieceInputValues[pieceKey] !== undefined) {
                                  return pieceInputValues[pieceKey];
                                }
                                // Otherwise, display the stored number value
                                if (piece.meters === 0) return '';
                                return piece.meters % 1 === 0 
                                  ? piece.meters.toString() 
                                  : piece.meters.toFixed(10).replace(/\.?0+$/, '');
                              })()}
                              onChange={(e) => {
                                const value = e.target.value;
                                const pieceKey = `${box.id}-${piece.id}`;
                                
                                // Allow empty, numbers, and decimals (including multiple decimal points check)
                                if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                                  // Prevent multiple decimal points
                                  const decimalCount = (value.match(/\./g) || []).length;
                                  if (decimalCount <= 1) {
                                    // Store the raw string value while typing (preserves decimal point)
                                    setPieceInputValues(prev => ({ ...prev, [pieceKey]: value }));
                                    
                                    // Also update the number value for calculations
                                    if (value === '' || value === '.' || value === '-') {
                                      handleUpdatePieceMeters(box.id, piece.id, 0, false, value);
                                    } else {
                                      const numValue = parseFloat(value);
                                      if (!isNaN(numValue)) {
                                        handleUpdatePieceMeters(box.id, piece.id, numValue, false, value);
                                      }
                                    }
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const value = e.currentTarget.value;
                                  const numValue = value === '' || value === '.' ? 0 : parseFloat(value) || 0;
                                  handleUpdatePieceMeters(box.id, piece.id, numValue, true);
                                }
                              }}
                              onBlur={(e) => {
                                // Finalize the value on blur
                                const value = e.target.value.trim();
                                if (value === '' || value === '.') {
                                  handleUpdatePieceMeters(box.id, piece.id, 0, false);
                                  return;
                                }
                                const numValue = parseFloat(value);
                                if (isNaN(numValue)) {
                                  handleUpdatePieceMeters(box.id, piece.id, 0, false);
                                } else {
                                  handleUpdatePieceMeters(box.id, piece.id, numValue, false);
                                }
                              }}
                              className="flex-1 bg-gray-800 border-gray-700 text-white text-sm"
                              placeholder="0.00"
                            />
                            <span className="text-gray-400 text-xs">M</span>
                            <Button
                              onClick={() => handleRemovePiece(box.id, piece.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loose Pieces Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-medium">Loose Pieces (No Box)</h3>
                </div>
                <Button
                  onClick={handleAddLoosePiece}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Piece
                </Button>
              </div>
              <p className="text-gray-400 text-sm">
                Optional: Add pieces sold without a box.
              </p>

              {loosePieces.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No loose pieces added.
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
                  {loosePieces.map((piece, index) => (
                    <div
                      key={piece.id}
                      className={cn(
                        "flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-2",
                        viewMode === 'list' && "w-full"
                      )}
                    >
                      <Input
                        ref={(el) => {
                          pieceInputRefs.current[`loose-${piece.id}`] = el;
                        }}
                        type="text"
                        inputMode="decimal"
                        value={(() => {
                          const pieceKey = `loose-${piece.id}`;
                          // If user is currently typing, use the input string value
                          if (pieceInputValues[pieceKey] !== undefined) {
                            return pieceInputValues[pieceKey];
                          }
                          // Otherwise, display the stored number value
                          if (piece.meters === 0) return '';
                          return piece.meters % 1 === 0 
                            ? piece.meters.toString() 
                            : piece.meters.toFixed(10).replace(/\.?0+$/, '');
                        })()}
                        onChange={(e) => {
                          const value = e.target.value;
                          const pieceKey = `loose-${piece.id}`;
                          
                          // Allow empty, numbers, and decimals (including multiple decimal points check)
                          if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                            // Prevent multiple decimal points
                            const decimalCount = (value.match(/\./g) || []).length;
                            if (decimalCount <= 1) {
                              // Store the raw string value while typing (preserves decimal point)
                              setPieceInputValues(prev => ({ ...prev, [pieceKey]: value }));
                              
                              // Also update the number value for calculations
                              if (value === '' || value === '.' || value === '-') {
                                handleUpdateLoosePieceMeters(piece.id, 0, false, value);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  handleUpdateLoosePieceMeters(piece.id, numValue, false, value);
                                }
                              }
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value;
                            const numValue = value === '' || value === '.' ? 0 : parseFloat(value) || 0;
                            handleUpdateLoosePieceMeters(piece.id, numValue, true);
                          }
                        }}
                        onBlur={(e) => {
                          // Finalize the value on blur
                          const value = e.target.value.trim();
                          if (value === '' || value === '.' || value === '-') {
                            handleUpdateLoosePieceMeters(piece.id, 0, false);
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (isNaN(numValue)) {
                            handleUpdateLoosePieceMeters(piece.id, 0, false);
                          } else {
                            handleUpdateLoosePieceMeters(piece.id, numValue, false);
                          }
                        }}
                        className="flex-1 bg-gray-900 border-gray-700 text-white text-sm"
                        placeholder="0.00"
                      />
                      <span className="text-gray-400 text-xs">M</span>
                      <Button
                        onClick={() => handleRemoveLoosePiece(piece.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Quick Entry Mode */
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-medium">Quick Entry - Enter Summary Totals</h3>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <p className="text-blue-300 text-sm">
                  Quick Entry Mode: Perfect for when you already know the totals and don't need detailed piece-by-piece tracking.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-gray-300 mb-2">
                  <Box className="w-4 h-4" />
                  <span>Number of Boxes</span>
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatDisplayValue(parseFloat(quickBoxes) || 0)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty, numbers, and decimals
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setQuickBoxes(value);
                    }
                  }}
                  onBlur={(e) => {
                    // Normalize on blur to remove leading zeros
                    const normalized = normalizeNumericInput(e.target.value);
                    setQuickBoxes(normalized === 0 ? '' : normalized.toString());
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., 1 or 1.5"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-300 mb-2">
                  <Layers className="w-4 h-4" />
                  <span>Number of Pieces</span>
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={quickPieces}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty, numbers, and decimals (including multiple decimal points check)
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      // Prevent multiple decimal points
                      const decimalCount = (value.match(/\./g) || []).length;
                      if (decimalCount <= 1) {
                        setQuickPieces(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Normalize on blur to remove leading zeros but keep decimals
                    const value = e.target.value.trim();
                    if (value === '' || value === '.') {
                      setQuickPieces('');
                      return;
                    }
                    // Parse and format, preserving decimals
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                      setQuickPieces('');
                    } else {
                      // Keep original decimal places if it was a decimal, otherwise show as is
                      setQuickPieces(value.includes('.') ? value.replace(/^0+(?=\d)/, '') : numValue.toString());
                    }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., 15 or 15.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-gray-300">
                    <Ruler className="w-4 h-4" />
                    <span>Total Meters</span>
                  </label>
                  <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-medium">Critical for Billing</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={quickMeters}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty, numbers, and decimals
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        // Prevent multiple decimal points
                        const decimalCount = (value.match(/\./g) || []).length;
                        if (decimalCount <= 1) {
                          setQuickMeters(value);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Normalize on blur but preserve decimals
                      const value = e.target.value.trim();
                      if (value === '' || value === '.') {
                        setQuickMeters('');
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        setQuickMeters('');
                      } else {
                        setQuickMeters(value.includes('.') ? value.replace(/^0+(?=\d)/, '') : numValue.toString());
                      }
                    }}
                    className="bg-gray-800 border-gray-700 text-white pr-8"
                    placeholder="e.g., 756.5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">M</span>
                </div>
              </div>

              {/* Average Calculation */}
              {quickPieces && parseFloat(quickPieces) > 0 && quickMeters && parseFloat(quickMeters) > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
                  <div className="space-y-2">
                    <div className="text-gray-400 text-sm">Average Meter per Piece:</div>
                    <div className="text-2xl font-bold text-white">
                      ~{((parseFloat(quickMeters) || 0) / (parseFloat(quickPieces) || 1)).toFixed(2)} M
                    </div>
                    <div className="text-xs text-gray-500">
                      Calculated as: {parseFloat(quickMeters).toFixed(2)} M ÷ {parseFloat(quickPieces)} pieces
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Totals */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Total Boxes</div>
            <div className="text-blue-400 text-2xl font-bold">{totals.totalBoxes}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Total Pieces</div>
            <div className="text-purple-400 text-2xl font-bold">{totals.totalPieces}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Total Meters</div>
            <div className="text-green-400 text-2xl font-bold">{totals.totalMeters.toFixed(2)}</div>
          </div>
        </div>

        {/* Tip */}
        {entryMode === 'detailed' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5" />
              <p className="text-yellow-300 text-sm">
                Tip: Press Enter after typing meters to quickly add another piece.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Save Packing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

