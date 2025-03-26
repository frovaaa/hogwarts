import { Box, Button } from '@mui/material';
import ROSLIB from 'roslib';

interface ActionsPanelProps {
    ros: ROSLIB.Ros | null;
}

export default function ActionsPanel({ ros }: ActionsPanelProps) {
    const publishLedColor = (r: number, g: number, b: number) => {
        if (ros) {
            const ledColorPublisher = new ROSLIB.Topic({
                ros,
                name: '/leds/color',
                messageType: 'std_msgs/ColorRGBA',
            });

            const msg = new ROSLIB.Message({
                r,
                g,
                b,
                a: 1.0, // full intensity
            });

            ledColorPublisher.publish(msg);
        }
    };

    return (
        <Box mt={2} display="flex" justifyContent="center" gap={2}>
            <Button
                variant="contained"
                color="primary"
                onClick={() => publishLedColor(1.0, 0.0, 0.0)}
            >
                Red LED
            </Button>
            <Button
                variant="contained"
                color="success"
                onClick={() => publishLedColor(0.0, 1.0, 0.0)}
            >
                Green LED
            </Button>
            <Button
                variant="contained"
                color="info"
                onClick={() => publishLedColor(0.0, 0.0, 1.0)}
            >
                Blue LED
            </Button>
        </Box>
    );
}
