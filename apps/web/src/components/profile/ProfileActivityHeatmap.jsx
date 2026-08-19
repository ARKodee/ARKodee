/**
 * ProfileActivityHeatmap - Practice consistency heatmap for the profile view
 */

import React from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { SubmissionCalendar } from '../practice/SubmissionCalendar'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

function findFirstActivityDate(calendarData) {
  const keys = Object.keys(calendarData || {})
    .map((rawKey) => {
      const count = Number(calendarData[rawKey] ?? 0)
      if (count <= 0) return null

      const parsedKey = Number(rawKey)
      const date = Number.isNaN(parsedKey)
        ? new Date(rawKey)
        : new Date(parsedKey < 1e12 ? parsedKey * 1000 : parsedKey)

      return Number.isNaN(date.getTime()) ? null : date
    })
    .filter(Boolean)

  if (keys.length === 0) return null

  const earliest = keys.reduce((earliestDate, currentDate) => (
    currentDate < earliestDate ? currentDate : earliestDate
  ))

  earliest.setHours(0, 0, 0, 0)
  return earliest
}

export function ProfileActivityHeatmap({ calendarData, isLoading, error, anchorDate = null }) {
  const firstActivityDate = anchorDate || findFirstActivityDate(calendarData)

  return (
    <Card className="profile-heatmap-card">
      <CardHeader>
        <CardTitle>Streak Heatmap</CardTitle>
      </CardHeader>
      <CardBody>
        {error ? (
          <EmptyState
            title="Heatmap unavailable"
            description={error}
          />
        ) : isLoading ? (
          <div className="profile-heatmap-card__skeleton">
            <Skeleton width="140px" height="16px" />
            <Skeleton width="100%" height="180px" style={{ marginTop: '16px' }} />
          </div>
        ) : (
          <SubmissionCalendar
            calendarData={calendarData}
            startDate={firstActivityDate}
          />
        )}
      </CardBody>
    </Card>
  )
}
