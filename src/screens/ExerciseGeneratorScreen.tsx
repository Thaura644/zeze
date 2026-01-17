import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import ExercisePlayer from '../components/Player/ExercisePlayer';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Exercise {
  id: string;
  type: 'melody' | 'chord' | 'scale' | 'riff';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  style: 'rock' | 'blues' | 'jazz' | 'folk' | 'classical';
  tempo: number;
  duration: number;
  key: string;
  audioUrl: string;
  tablature: any;
  instructions: any;
  variations?: any[];
  generatedAt: string;
  fallback?: boolean;
}

const ExerciseGeneratorScreen: React.FC = () => {
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedStyle, setSelectedStyle] = useState<'rock' | 'blues' | 'jazz' | 'folk' | 'classical'>('rock');
  const [selectedExerciseType, setSelectedExerciseType] = useState<'melody' | 'chord' | 'scale' | 'riff'>('melody');
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [tempo, setTempo] = useState<number>(120);
  const [duration, setDuration] = useState<number>(30);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const skillLevels: Array<{ value: 'beginner' | 'intermediate' | 'advanced'; label: string; icon: string }> = [
    { value: 'beginner', label: 'Beginner', icon: 'school-outline' },
    { value: 'intermediate', label: 'Intermediate', icon: 'trending-up-outline' },
    { value: 'advanced', label: 'Advanced', icon: 'rocket-outline' },
  ];

  const musicStyles: Array<{ value: 'rock' | 'blues' | 'jazz' | 'folk' | 'classical'; label: string; icon: string }> = [
    { value: 'rock', label: 'Rock', icon: 'musical-notes' },
    { value: 'blues', label: 'Blues', icon: 'musical-note-outline' },
    { value: 'jazz', label: 'Jazz', icon: 'musical-notes-outline' },
    { value: 'folk', label: 'Folk', icon: 'leaf-outline' },
    { value: 'classical', label: 'Classical', icon: 'library-outline' },
  ];

  const exerciseTypes: Array<{ value: 'melody' | 'chord' | 'scale' | 'riff'; label: string; description: string }> = [
    { value: 'melody', label: 'Melody', description: 'Single-note melodic lines' },
    { value: 'chord', label: 'Chords', description: 'Chord progressions and strumming' },
    { value: 'scale', label: 'Scales', description: 'Scale practice exercises' },
    { value: 'riff', label: 'Riffs', description: 'Guitar riffs and patterns' },
  ];

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const generateExercise = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/exercises/generate-exercise`, {
        skillLevel: selectedSkillLevel,
        style: selectedStyle,
        tempo,
        duration,
        key: selectedKey,
        exerciseType: selectedExerciseType,
      });

      if (response.data.success) {
        const exerciseData = {
          ...response.data.exercise,
          audioUrl: `${API_BASE_URL}${response.data.exercise.audioUrl}`,
        };
        setCurrentExercise(exerciseData);
      } else {
        Alert.alert('Error', 'Failed to generate exercise');
      }
    } catch (error) {
      console.error('Error generating exercise:', error);
      Alert.alert('Error', 'Failed to generate exercise. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadFromLibrary = async (templateId: string) => {
    setIsGenerating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/exercises/load/${templateId}`);
      
      if (response.data.success) {
        const exerciseData = {
          ...response.data.exercise,
          audioUrl: `${API_BASE_URL}${response.data.exercise.audioUrl}`,
        };
        setCurrentExercise(exerciseData);
        setShowLibrary(false);
      }
    } catch (error) {
      console.error('Error loading exercise:', error);
      Alert.alert('Error', 'Failed to load exercise');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClosePlayer = () => {
    setCurrentExercise(null);
  };

  const renderOptionButtons = <T extends string>(
    options: Array<{ value: T; label: string; icon?: string; description?: string }>,
    selectedValue: T,
    onSelect: React.Dispatch<React.SetStateAction<T>>,
    type: 'icon' | 'card' = 'card'
  ) => {
    return (
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              selectedValue === option.value && styles.selectedOption,
              type === 'icon' && styles.iconOptionButton,
            ]}
            onPress={() => onSelect(option.value as T)}
          >
            {type === 'icon' && option.icon && (
              <Ionicons
                name={option.icon as any}
                size={24}
                color={selectedValue === option.value ? '#fff' : '#666'}
              />
            )}
            <Text
              style={[
                styles.optionText,
                selectedValue === option.value && styles.selectedOptionText,
              ]}
            >
              {option.label}
            </Text>
            {option.description && (
              <Text style={styles.optionDescription}>{option.description}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSliderControl = (
    label: string,
    value: number,
    setValue: (value: number) => void,
    min: number,
    max: number,
    step: number = 1,
    unit: string = ''
  ) => (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>
        {label}: {value}{unit}
      </Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderMin}>{min}{unit}</Text>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={setValue}
          minimumTrackTintColor="#FF6B6B"
          maximumTrackTintColor="#333"
          thumbTintColor="#FF6B6B"
          step={step}
        />
        <Text style={styles.sliderMax}>{max}{unit}</Text>
      </View>
    </View>
  );

  if (currentExercise) {
    return (
      <ExercisePlayer
        exercise={currentExercise}
        onClose={handleClosePlayer}
        onVariationSelect={(variation) => {
          console.log('Loading variation:', variation);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Generator</Text>
        <TouchableOpacity
          style={styles.libraryButton}
          onPress={() => setShowLibrary(!showLibrary)}
        >
          <Ionicons name="library-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showLibrary ? (
          <View style={styles.librarySection}>
            <Text style={styles.sectionTitle}>Exercise Library</Text>
            {[
              { id: 'basic-em-scale', name: 'Basic E Minor Scale', skillLevel: 'beginner' },
              { id: 'blues-chord-progression', name: '12-Bar Blues in A', skillLevel: 'intermediate' },
              { id: 'rock-guitar-riff', name: 'Classic Rock Riff', skillLevel: 'intermediate' },
              { id: 'jazz-melody', name: 'Jazz Melody Exercise', skillLevel: 'advanced' },
            ].map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.libraryItem}
                onPress={() => loadFromLibrary(template.id)}
              >
                <Text style={styles.libraryItemName}>{template.name}</Text>
                <Text style={styles.libraryItemLevel}>{template.skillLevel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            {/* Skill Level Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skill Level</Text>
              {renderOptionButtons(skillLevels, selectedSkillLevel, setSelectedSkillLevel, 'icon')}
            </View>

            {/* Style Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Musical Style</Text>
              {renderOptionButtons(musicStyles, selectedStyle, setSelectedStyle, 'icon')}
            </View>

            {/* Exercise Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercise Type</Text>
              {renderOptionButtons(exerciseTypes, selectedExerciseType, setSelectedExerciseType, 'card')}
            </View>

            {/* Key Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key</Text>
              <View style={styles.keyContainer}>
                {keys.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.keyButton,
                      selectedKey === key && styles.selectedKey,
                    ]}
                    onPress={() => setSelectedKey(key)}
                  >
                    <Text
                      style={[
                        styles.keyText,
                        selectedKey === key && styles.selectedKeyText,
                      ]}
                    >
                      {key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tempo Control */}
            <View style={styles.section}>
              {renderSliderControl('Tempo', tempo, setTempo, 40, 200, 5, ' BPM')}
            </View>

            {/* Duration Control */}
            <View style={styles.section}>
              {renderSliderControl('Duration', duration, setDuration, 10, 120, 5, 's')}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.disabledButton]}
              onPress={generateExercise}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Ionicons name="musical-notes" size={24} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Exercise</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#2a2a2a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  libraryButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  iconOptionButton: {
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#FF6B6B',
  },
  optionText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  selectedOptionText: {
    color: '#fff',
  },
  optionDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  keyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyButton: {
    backgroundColor: '#2a2a2a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedKey: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  keyText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedKeyText: {
    color: '#fff',
  },
  sliderContainer: {
    marginBottom: 10,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMin: {
    color: '#666',
    fontSize: 12,
    width: 30,
  },
  sliderMax: {
    color: '#666',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  generateButton: {
    backgroundColor: '#FF6B6B',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  librarySection: {
    marginBottom: 20,
  },
  libraryItem: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  libraryItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  libraryItemLevel: {
    color: '#FF6B6B',
    fontSize: 12,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});

export default ExerciseGeneratorScreen;