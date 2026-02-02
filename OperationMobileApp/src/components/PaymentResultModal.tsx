import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle, X } from 'lucide-react-native';

interface PaymentResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  referenceNo: string;
  isDarkMode?: boolean;
}

const PaymentResultModal: React.FC<PaymentResultModalProps> = ({
  isOpen,
  onClose,
  success,
  referenceNo,
  isDarkMode = true
}) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center p-4">
        <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-xl w-full max-w-md p-6 relative`}>
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <X size={24} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>

          {/* Icon and Title */}
          <View className="items-center mb-6">
            <View className="mb-4">
              {success ? (
                <CheckCircle size={64} color="#22c55e" />
              ) : (
                <XCircle size={64} color="#ef4444" />
              )}
            </View>

            <Text className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
              {success ? 'Payment Successful!' : 'Payment Failed'}
            </Text>

            <Text className={`text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              {success
                ? 'Your payment has been received and is being processed.'
                : 'We were unable to process your payment. Please try again.'
              }
            </Text>
          </View>

          {/* Reference Number */}
          <View className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            } rounded-lg p-4 mb-6`}>
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              Reference Number
            </Text>
            <Text className={`font-medium text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
              {referenceNo}
            </Text>
          </View>

          {/* Message */}
          <View className="mb-6">
            {success ? (
              <View>
                <Text className={`mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  ✓ Payment confirmation sent
                </Text>
                <Text className={`mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  ✓ Account balance will be updated shortly
                </Text>
                <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  ✓ You can check your transaction history for details
                </Text>
              </View>
            ) : (
              <Text className={`mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                If you encountered any issues, please contact support or try again.
              </Text>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className={`w-full py-3 px-4 rounded-lg items-center ${success
                ? 'bg-green-600'
                : 'bg-red-600'
              }`}
          >
            <Text className="text-white font-medium">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PaymentResultModal;
