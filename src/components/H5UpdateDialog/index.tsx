/**
 * H5更新对话框组件
 * 支持状态：检查更新、下载中（带进度）、更新成功
 */

import React from 'react';
import { View, Text, Progress } from '@tarojs/components';
import './index.scss';

export type UpdateStatus = 'checking' | 'ready' | 'downloading' | 'success' | 'error';

interface H5UpdateDialogProps {
  visible: boolean;
  status: UpdateStatus;
  version: string;
  releaseNotes?: string;
  isForceUpdate: boolean;
  progress?: number; // 0-100
  errorMessage?: string;
  onUpdate: () => void;
  onCancel?: () => void;
  onClose?: () => void; // 更新成功后关闭
}

const H5UpdateDialog: React.FC<H5UpdateDialogProps> = ({
  visible,
  status,
  version,
  releaseNotes,
  isForceUpdate,
  progress = 0,
  errorMessage,
  onUpdate,
  onCancel,
  onClose
}) => {
  if (!visible) return null;

  const handleMaskClick = () => {
    // 下载中或强制更新时不允许关闭
    if (status === 'downloading') return;
    if (isForceUpdate && status !== 'success') return;
    if (status === 'success' && onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <View className="status-content">
            <View className="loading-spinner" />
            <Text className="status-text">正在检查更新...</Text>
          </View>
        );

      case 'ready':
        return (
          <>
            <View className="release-notes-section">
              <Text className="notes-title">更新内容：</Text>
              <Text className="notes-text">
                {releaseNotes || '修复已知问题，优化用户体验'}
              </Text>
            </View>
            {isForceUpdate && (
              <View className="force-update-tip">
                <Text className="tip-text">⚠️ 此版本为强制更新</Text>
              </View>
            )}
          </>
        );

      case 'downloading':
        return (
          <View className="download-section">
            <Text className="download-text">正在下载更新...</Text>
            <View className="progress-container">
              <Progress
                percent={progress}
                strokeWidth={6}
                activeColor="#667eea"
                backgroundColor="#e0e0e0"
              />
              <Text className="progress-text">{Math.round(progress)}%</Text>
            </View>
            <Text className="download-tip">请勿关闭应用</Text>
          </View>
        );

      case 'success':
        return (
          <View className="success-section">
            <View className="success-icon">✓</View>
            <Text className="success-text">更新成功！</Text>
            <View className="release-notes-section">
              <Text className="notes-title">更新内容：</Text>
              <Text className="notes-text">
                {releaseNotes || '修复已知问题，优化用户体验'}
              </Text>
            </View>
          </View>
        );

      case 'error':
        return (
          <View className="error-section">
            <View className="error-icon">✕</View>
            <Text className="error-text">更新失败</Text>
            <Text className="error-message">{errorMessage || '请稍后重试'}</Text>
          </View>
        );

      default:
        return null;
    }
  };

  const renderFooter = () => {
    switch (status) {
      case 'checking':
      case 'downloading':
        return null; // 不显示按钮

      case 'ready':
        return (
          <View className="dialog-footer">
            {!isForceUpdate && onCancel && (
              <View className="btn btn-cancel" onClick={onCancel}>
                <Text className="btn-text">稍后更新</Text>
              </View>
            )}
            <View
              className={`btn btn-update ${isForceUpdate ? 'btn-full' : ''}`}
              onClick={onUpdate}
            >
              <Text className="btn-text">立即更新</Text>
            </View>
          </View>
        );

      case 'success':
        return (
          <View className="dialog-footer">
            <View className="btn btn-update btn-full" onClick={onClose}>
              <Text className="btn-text">重启应用</Text>
            </View>
          </View>
        );

      case 'error':
        return (
          <View className="dialog-footer">
            {!isForceUpdate && onCancel && (
              <View className="btn btn-cancel" onClick={onCancel}>
                <Text className="btn-text">取消</Text>
              </View>
            )}
            <View
              className={`btn btn-update ${isForceUpdate ? 'btn-full' : ''}`}
              onClick={onUpdate}
            >
              <Text className="btn-text">重试</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'checking':
        return '检查更新';
      case 'ready':
        return '发现新版本';
      case 'downloading':
        return '正在更新';
      case 'success':
        return '更新完成';
      case 'error':
        return '更新失败';
      default:
        return '更新';
    }
  };

  return (
    <View className="h5-update-dialog-mask" onClick={handleMaskClick}>
      <View className="h5-update-dialog" onClick={(e) => e.stopPropagation()}>
        <View className={`dialog-header ${status === 'success' ? 'success' : ''} ${status === 'error' ? 'error' : ''}`}>
          <Text className="dialog-title">{getTitle()}</Text>
          {(status === 'ready' || status === 'downloading' || status === 'success') && (
            <Text className="dialog-version">v{version}</Text>
          )}
        </View>

        <View className="dialog-content">
          {renderContent()}
        </View>

        {renderFooter()}
      </View>
    </View>
  );
};

export default H5UpdateDialog;
