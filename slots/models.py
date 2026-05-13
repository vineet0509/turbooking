from django.db import models
import uuid


class Slot(models.Model):
    """A bookable time slot for a turf"""

    AVAILABLE = 'available'
    BOOKED = 'booked'
    BLOCKED = 'blocked'

    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (BOOKED, 'Booked'),
        (BLOCKED, 'Blocked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='slots')
    turf = models.ForeignKey('tenants.TurfGround', on_delete=models.CASCADE, related_name='slots')

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=AVAILABLE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'slots'
        unique_together = ('turf', 'date', 'start_time')
        ordering = ['date', 'start_time']
        indexes = [
            models.Index(fields=['tenant', 'date', 'status']),
            models.Index(fields=['turf', 'date']),
        ]

    def __str__(self):
        return f'{self.turf.name} | {self.date} {self.start_time}–{self.end_time}'


class SlotTemplate(models.Model):
    """Recurring slot template for auto-generating slots"""

    DAYS = [
        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
        (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='slot_templates')
    turf = models.ForeignKey('tenants.TurfGround', on_delete=models.CASCADE, related_name='slot_templates')
    day_of_week = models.IntegerField(choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'slot_templates'
        unique_together = ('turf', 'day_of_week', 'start_time')

    def __str__(self):
        return f'{self.turf.name} | {self.get_day_of_week_display()} {self.start_time}–{self.end_time}'
