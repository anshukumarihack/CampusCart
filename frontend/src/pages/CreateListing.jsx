import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, X, DollarSign, Tag, Info } from 'lucide-react';

const CATEGORIES = [
  'Textbooks', 
  'Electronics', 
  'Calculators', 
  'Furniture', 
  'Bicycles', 
  'Clothing', 
  'Hostel Essentials', 
  'Other'
];

const CONDITIONS = [
  { value: 'New', desc: 'Brand new, never used, in original packaging' },
  { value: 'Like New', desc: 'Minimal signs of wear, fully functional' },
  { value: 'Good', desc: 'Moderate signs of wear, fully functional' },
  { value: 'Used', desc: 'Heavy wear, functional defects described' }
];

export default function CreateListing() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check 5 images limit
    if (imageFiles.length + files.length > 5) {
      setError('You can upload up to 5 images only.');
      return;
    }

    setError('');
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    // Create object URLs for previewing
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]); // Free memory
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !price || !category || !condition) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('condition', condition);
    
    imageFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('http://127.0.0.1:5050/api/listings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create product listing');
      }

      navigate(`/listings/${data.listing._id}`);
    } catch (err) {
      setError(err.message || 'Failed to publish listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }} className="animate-fade">
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
          Create New Listing
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Sell, swap, or donate textbooks, calculators, furniture, or hostel essentials to other students on campus.
        </p>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-glow)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Listing Title
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Organic Chemistry Textbook (12th Edition)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Category
              </label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Price ($)
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00 (Enter 0 for free/donation)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          {/* Condition Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Item Condition
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {CONDITIONS.map(cond => (
                <div 
                  key={cond.value}
                  onClick={() => setCondition(cond.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid',
                    borderColor: condition === cond.value ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: condition === cond.value ? 'var(--primary-glow)' : 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '2px' }}>{cond.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cond.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Detailed Description
            </label>
            <textarea
              className="input-field"
              placeholder="Describe the condition, usage period, notes on missing components, or meetup availability..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ resize: 'vertical' }}
              required
            />
          </div>

          {/* Image Uploads */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Upload Images (Max 5)
            </label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {/* Preview Grids */}
              {previews.map((preview, index) => (
                <div 
                  key={index} 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: 'var(--radius-md)', 
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: 'none',
                      color: 'white',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Upload Trigger Square */}
              {previews.length < 5 && (
                <label 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-input)',
                    transition: 'var(--transition)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              Tip: Clear, high-resolution pictures help buyers understand the condition better.
            </span>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '14px', width: '100%', fontSize: '16px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Publishing listing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
