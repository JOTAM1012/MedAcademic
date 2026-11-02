import React from 'react';
import { AddStudyTopicModal } from './AddStudyTopicModal';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectId?: string;
  defaultSpecialty?: string;
}

export const AddTopicModal: React.FC<AddTopicModalProps> = (props) => {
  return <AddStudyTopicModal {...props} />;
};
