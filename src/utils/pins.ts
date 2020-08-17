import {DimensionColPin, Pin} from '../interfaces';

export function pinToColPin(pinned: Pin): DimensionColPin {
    switch (pinned) {
        case 'pinStart':
            return 'colPinStart';
        case 'pinEnd':
            return 'colPinEnd';
    }
}