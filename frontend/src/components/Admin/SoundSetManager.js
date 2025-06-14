import React, { useState, useEffect } from 'react';
import './SoundSetManager.css';

const SoundSetManager = () => {
  const [soundSets, setSoundSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingSet, setEditingSet] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
    normal_beat_sound: null,
    accent_sound: null,
    first_beat_sound: null,
  });

  useEffect(() => {
    fetchSoundSets();
  }, []);

  const fetchSoundSets = async () => {
    try {
      const response = await fetch('/api/sound-sets/', {
        credentials: 'include',
      });
      const data = await response.json();
      setSoundSets(data);
    } catch (err) {
      setError('Failed to load sound sets');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('is_default', formData.is_default);
    
    if (formData.normal_beat_sound) {
      formDataObj.append('normal_beat_sound', formData.normal_beat_sound);
    }
    if (formData.accent_sound) {
      formDataObj.append('accent_sound', formData.accent_sound);
    }
    if (formData.first_beat_sound) {
      formDataObj.append('first_beat_sound', formData.first_beat_sound);
    }

    try {
      const url = editingSet 
        ? `/api/sound-sets/${editingSet.id}/` 
        : '/api/sound-sets/';
      
      const method = editingSet ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        body: formDataObj,
        credentials: 'include',
        headers: {
          'Authorization': `Token ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        fetchSoundSets();
        resetForm();
        setShowUploadForm(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save sound set');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sound set?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sound-sets/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Token ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        fetchSoundSets();
      } else {
        setError('Failed to delete sound set');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_default: false,
      normal_beat_sound: null,
      accent_sound: null,
      first_beat_sound: null,
    });
    setEditingSet(null);
  };

  const handleEdit = (soundSet) => {
    setEditingSet(soundSet);
    setFormData({
      name: soundSet.name,
      description: soundSet.description,
      is_default: soundSet.is_active,
      normal_beat_sound: null,
      accent_sound: null,
      first_beat_sound: null,
    });
    setShowUploadForm(true);
  };

  const handleFileChange = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="sound-set-manager">
      <div className="manager-header">
        <h2>Sound Set Management</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel' : 'Add New Sound Set'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}

      {showUploadForm && (
        <div className="upload-form">
          <h3>{editingSet ? 'Edit Sound Set' : 'New Sound Set'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                />
                Set as default sound set
              </label>
            </div>

            <div className="sound-files">
              <div className="form-group">
                <label htmlFor="normal_beat_sound">Normal Beat Sound (MP3)</label>
                <input
                  id="normal_beat_sound"
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={(e) => handleFileChange('normal_beat_sound', e.target.files[0])}
                  required={!editingSet}
                />
                {editingSet && <small>Leave empty to keep current file</small>}
              </div>

              <div className="form-group">
                <label htmlFor="accent_sound">Accent Sound (MP3)</label>
                <input
                  id="accent_sound"
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={(e) => handleFileChange('accent_sound', e.target.files[0])}
                  required={!editingSet}
                />
                {editingSet && <small>Leave empty to keep current file</small>}
              </div>

              <div className="form-group">
                <label htmlFor="first_beat_sound">First Beat Sound (MP3)</label>
                <input
                  id="first_beat_sound"
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={(e) => handleFileChange('first_beat_sound', e.target.files[0])}
                  required={!editingSet}
                />
                {editingSet && <small>Leave empty to keep current file</small>}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingSet ? 'Update' : 'Create'} Sound Set
              </button>
              <button type="button" onClick={() => {resetForm(); setShowUploadForm(false);}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="sound-sets-list">
        <h3>Existing Sound Sets</h3>
        {soundSets.length === 0 ? (
          <p>No sound sets found. Create your first one!</p>
        ) : (
          <div className="sound-set-grid">
            {soundSets.map(set => (
              <div key={set.id} className="sound-set-card">
                <h4>{set.name}</h4>
                <p>{set.description}</p>
                <div className="sound-previews">
                  <button 
                    className="preview-btn"
                    onClick={() => playSound(set.normal_beat_sound_url)}
                    title="Play normal beat"
                  >
                    🔊 Normal
                  </button>
                  <button 
                    className="preview-btn"
                    onClick={() => playSound(set.accent_sound_url)}
                    title="Play accent"
                  >
                    🔊 Accent
                  </button>
                  <button 
                    className="preview-btn"
                    onClick={() => playSound(set.first_beat_sound_url)}
                    title="Play first beat"
                  >
                    🔊 First
                  </button>
                </div>
                <div className="card-actions">
                  <button onClick={() => handleEdit(set)}>Edit</button>
                  <button onClick={() => handleDelete(set.id)} className="delete-btn">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const playSound = (url) => {
  const audio = new Audio(url);
  audio.play().catch(err => console.error('Failed to play sound:', err));
};

export default SoundSetManager;