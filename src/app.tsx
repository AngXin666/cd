/**
 * @file Taro application entry file
 */

import {AuthProvider} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {supabase} from '@/client/supabase'
import './app.scss'

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  return <AuthProvider client={supabase}>{children}</AuthProvider>
}

export default App
